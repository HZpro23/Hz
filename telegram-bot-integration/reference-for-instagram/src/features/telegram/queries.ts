import "server-only";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

/** Active products only — a Telegram voice order should never resolve to a
 * product that's been deactivated, mirroring how POS only sells ACTIVE
 * products (`src/features/pos/queries.ts`). */
export async function getProductsForVoiceMatching() {
  return prisma.product.findMany({
    where: { status: "ACTIVE" },
    select: {
      id: true,
      name: true,
      description: true,
      sku: true,
      barcode: true,
      price1: true,
    },
  });
}

export type ProductForVoiceMatching = Awaited<
  ReturnType<typeof getProductsForVoiceMatching>
>[number];

export async function getTelegramAccountsForAdmin(adminId: string) {
  return prisma.telegramAccount.findMany({
    where: { adminId },
    orderBy: { linkedAt: "asc" },
    select: { id: true, name: true, username: true, linkedAt: true },
  });
}

/** HZ has a single admin whose login comes from env vars, so the `Admin`
 * table may be empty. The Telegram tables need a real Admin row to point at,
 * so this finds it by email — creating a placeholder (random, unusable
 * password; login never reads it) for the env-configured admin if missing. */
export async function resolveBotAdmin(email: string | null | undefined) {
  const envEmail = process.env.SEED_ADMIN_EMAIL;
  const candidate = email || envEmail;
  if (!candidate) return null;

  const existing = await prisma.admin.findUnique({
    where: { email: candidate },
    select: { id: true, name: true },
  });
  if (existing) return existing;
  if (candidate !== envEmail) return null;

  return prisma.admin.create({
    data: {
      email: candidate,
      name: process.env.SEED_ADMIN_NAME || "مدير النظام",
      password: await bcrypt.hash(randomUUID(), 10),
    },
    select: { id: true, name: true },
  });
}

const VOICE_HINT_TTL_MS = 10 * 60_000;
const VOICE_HINT_MAX_CHARS = 450; // Whisper only reads ~224 tokens of prompt
let voiceHintCache: { text: string; expiresAt: number } | null = null;

/** Whisper `prompt` for voice messages: a one-line description of the
 * speaker's role plus the product names sold most often (falling back to the
 * newest products), so Whisper spells those names the way the catalog does.
 * Cached briefly — it's built from invoice history, not per message. */
export async function getVoiceHintPrompt(): Promise<string> {
  if (voiceHintCache && voiceHintCache.expiresAt > Date.now()) {
    return voiceHintCache.text;
  }

  let names = (
    await prisma.$queryRaw<{ name: string }[]>`
      SELECT p.name
      FROM "InvoiceItem" ii
      JOIN "Product" p ON p.id = ii."productId"
      WHERE p.status = 'ACTIVE'
      GROUP BY p.id, p.name
      ORDER BY SUM(ii.quantity) DESC
      LIMIT 40
    `
  ).map((row) => row.name.trim());

  if (names.length === 0) {
    names = (
      await prisma.product.findMany({
        where: { status: "ACTIVE" },
        orderBy: { createdAt: "desc" },
        take: 40,
        select: { name: true },
      })
    ).map((row) => row.name.trim());
  }

  const intro =
    "تسجيل صوتي لموظف في محل يُنشئ فاتورة بيع: يقول أوامر مثل: دير، زيد، حيد، امسح، بدل، خلص، صافي، ثم أسماء المنتجات والكميات واسم العميل والدفع بالدرهم (كاش أو تحويل بنكي أو شيك). المنتجات: ";
  let list = "";
  for (const name of names) {
    const next = list ? `${list}، ${name}` : name;
    if (intro.length + next.length > VOICE_HINT_MAX_CHARS) break;
    list = next;
  }

  const text = list ? `${intro}${list}.` : intro.replace(/ المنتجات: $/, "");
  voiceHintCache = { text, expiresAt: Date.now() + VOICE_HINT_TTL_MS };
  return text;
}
