"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { verifyTelegramInitData } from "@/lib/telegram-init-data";
import { searchCustomers } from "@/features/customers/queries";
import { resolveBotAdmin } from "@/features/telegram/queries";
import {
  getDraftByToken,
  computeDraftTotals,
  confirmDraft,
  cancelDraft,
  pickCandidateForItem,
  buildPaymentPatch,
  type DraftWithItems,
} from "@/features/telegram/draft";
import {
  miniAppBaseSchema,
  miniAppSetQuantitySchema,
  miniAppRemoveItemSchema,
  miniAppAddItemSchema,
  miniAppSetCustomerSchema,
  miniAppPickCandidateSchema,
  miniAppSetPaymentSchema,
  type MiniAppBaseInput,
} from "@/features/telegram/schema";

const LINK_TOKEN_TTL_MINUTES = 15;

// ---------------------------------------------------------------------------
// Account linking — initiated from the admin's own dashboard session.
// ---------------------------------------------------------------------------

/** Dashboard-session gate for link/unlink: HZ has one admin, so "has
 * permission" just means "is logged in and maps to a real Admin row". */
async function requireDashboardAdmin(): Promise<
  { ok: true; adminId: string } | { ok: false; error: string }
> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "غير مصرح" };
  const admin = await resolveBotAdmin(session.user.email);
  if (!admin) return { ok: false, error: "غير مصرح" };
  return { ok: true, adminId: admin.id };
}

export async function generateTelegramLinkToken(): Promise<
  | { error: string }
  | { success: true; token: string; deepLink: string; expiresAt: string }
> {
  const access = await requireDashboardAdmin();
  if (!access.ok) return { error: access.error };

  const botUsername = process.env.TELEGRAM_BOT_USERNAME;
  if (!botUsername) return { error: "TELEGRAM_BOT_USERNAME is not set" };

  const token = randomUUID();
  const expiresAt = new Date(Date.now() + LINK_TOKEN_TTL_MINUTES * 60_000);
  await prisma.telegramLinkToken.create({
    data: { token, adminId: access.adminId, expiresAt },
  });

  revalidatePath("/dashboard/settings/telegram");
  return {
    success: true,
    token,
    deepLink: `https://t.me/${botUsername}?start=${token}`,
    expiresAt: expiresAt.toISOString(),
  };
}

export async function unlinkTelegramAccount(accountId: string): Promise<{
  error?: string;
  success?: boolean;
}> {
  const access = await requireDashboardAdmin();
  if (!access.ok) return { error: access.error };
  if (!accountId) return { error: "invalid_input" };

  await prisma.telegramAccount.deleteMany({
    where: { id: accountId, adminId: access.adminId },
  });
  revalidatePath("/dashboard/settings/telegram");
  return { success: true };
}

type MiniAppAccess =
  | {
      ok: true;
      adminId: string;
      draft: NonNullable<DraftWithItems>;
    }
  | { ok: false; error: string };

async function requireMiniAppAccess(
  input: MiniAppBaseInput,
): Promise<MiniAppAccess> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) return { ok: false, error: "config" };

  const verified = verifyTelegramInitData(input.initData, botToken);
  if (!verified.ok) return { ok: false, error: "unauthorized" };

  const account = await prisma.telegramAccount.findUnique({
    where: { telegramUserId: verified.telegramUserId },
  });
  if (!account || !account.isActive) return { ok: false, error: "not_linked" };

  const admin = await prisma.admin.findUnique({
    where: { id: account.adminId },
    select: { id: true },
  });
  if (!admin) return { ok: false, error: "forbidden" };

  const draft = await getDraftByToken(input.token);
  if (!draft || draft.telegramAccountId !== account.id) {
    return { ok: false, error: "not_found" };
  }
  if (draft.status !== "PENDING") return { ok: false, error: "not_pending" };

  return { ok: true, adminId: account.adminId, draft };
}

async function draftView(draft: NonNullable<DraftWithItems>) {
  const totals = computeDraftTotals(draft);

  const allCandidateIds = Array.from(
    new Set(draft.items.flatMap((item) => item.candidateProductIds)),
  );
  const candidateProducts = allCandidateIds.length
    ? await prisma.product.findMany({
        where: { id: { in: allCandidateIds } },
        select: { id: true, name: true },
      })
    : [];
  const candidateById = new Map(candidateProducts.map((p) => [p.id, p]));

  return {
    token: draft.token,
    status: draft.status,
    customer: draft.customer,
    expiresAt: draft.expiresAt.toISOString(),
    items: draft.items.map((item) => ({
      id: item.id,
      spokenName: item.spokenName,
      quantity: item.quantity,
      matchStatus: item.matchStatus,
      matchedProduct: item.matchedProduct
        ? {
            id: item.matchedProduct.id,
            name: item.matchedProduct.name,
            price1: Number(item.matchedProduct.price1),
            status: item.matchedProduct.status,
          }
        : null,
      candidates: item.candidateProductIds
        .map((id) => candidateById.get(id))
        .filter((p): p is { id: string; name: string } => Boolean(p)),
    })),
    total: totals.total,
    payment: totals.payment,
    paidInFull: draft.paidInFull,
    paymentAmount: draft.paymentAmount ? Number(draft.paymentAmount) : null,
    hasUnresolvedItems: totals.hasUnresolvedItems,
  };
}

export type TelegramDraftView = Awaited<ReturnType<typeof draftView>>;

export async function getTelegramDraftForMiniApp(
  input: MiniAppBaseInput,
): Promise<
  | { error: string }
  | { success: true; draft: TelegramDraftView }
> {
  const access = await requireMiniAppAccess(input);
  if (!access.ok) return { error: access.error };
  return { success: true, draft: await draftView(access.draft) };
}

export async function searchTelegramCustomersAction(
  input: MiniAppBaseInput & { q?: string },
) {
  const access = await requireMiniAppAccess(input);
  if (!access.ok) return { items: [], hasMore: false };
  const items = await searchCustomers(input.q ?? "");
  return { items, hasMore: false };
}

export async function searchTelegramProductsAction(
  input: MiniAppBaseInput & { q?: string },
) {
  const access = await requireMiniAppAccess(input);
  if (!access.ok) return { items: [], total: 0, nextOffset: null };
  const q = input.q?.trim();
  const products = await prisma.product.findMany({
    where: {
      status: "ACTIVE",
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { sku: { contains: q, mode: "insensitive" } },
              { barcode: { contains: q } },
            ],
          }
        : {}),
    },
    orderBy: { name: "asc" },
    take: 20,
    select: { id: true, name: true, sku: true, price1: true },
  });
  return {
    items: products.map((p) => ({ ...p, price1: Number(p.price1) })),
    total: products.length,
    nextOffset: null,
  };
}

export async function setTelegramDraftCustomerAction(
  input: unknown,
): Promise<{ error: string } | { success: true; draft: TelegramDraftView }> {
  const parsed = miniAppSetCustomerSchema.safeParse(input);
  if (!parsed.success) return { error: "invalid_input" };
  const access = await requireMiniAppAccess(parsed.data);
  if (!access.ok) return { error: access.error };

  const customer = await prisma.customer.findUnique({
    where: { id: parsed.data.customerId },
    select: { id: true },
  });
  if (!customer) return { error: "customer_not_found" };

  await prisma.telegramInvoiceDraft.update({
    where: { id: access.draft.id },
    data: { customerId: customer.id },
  });
  const refreshed = await getDraftByToken(parsed.data.token);
  return { success: true, draft: await draftView(refreshed!) };
}

export async function updateTelegramDraftItemQuantityAction(
  input: unknown,
): Promise<{ error: string } | { success: true; draft: TelegramDraftView }> {
  const parsed = miniAppSetQuantitySchema.safeParse(input);
  if (!parsed.success) return { error: "invalid_input" };
  const access = await requireMiniAppAccess(parsed.data);
  if (!access.ok) return { error: access.error };

  const item = access.draft.items.find((i) => i.id === parsed.data.itemId);
  if (!item) return { error: "item_not_found" };

  await prisma.telegramInvoiceDraftItem.update({
    where: { id: item.id },
    data: { quantity: parsed.data.quantity },
  });
  const refreshed = await getDraftByToken(parsed.data.token);
  return { success: true, draft: await draftView(refreshed!) };
}

export async function removeTelegramDraftItemAction(
  input: unknown,
): Promise<{ error: string } | { success: true; draft: TelegramDraftView }> {
  const parsed = miniAppRemoveItemSchema.safeParse(input);
  if (!parsed.success) return { error: "invalid_input" };
  const access = await requireMiniAppAccess(parsed.data);
  if (!access.ok) return { error: access.error };

  const item = access.draft.items.find((i) => i.id === parsed.data.itemId);
  if (!item) return { error: "item_not_found" };

  await prisma.telegramInvoiceDraftItem.delete({ where: { id: item.id } });
  const refreshed = await getDraftByToken(parsed.data.token);
  return { success: true, draft: await draftView(refreshed!) };
}

export async function addTelegramDraftItemAction(
  input: unknown,
): Promise<{ error: string } | { success: true; draft: TelegramDraftView }> {
  const parsed = miniAppAddItemSchema.safeParse(input);
  if (!parsed.success) return { error: "invalid_input" };
  const access = await requireMiniAppAccess(parsed.data);
  if (!access.ok) return { error: access.error };

  // The Mini App only ever sends a productId (chosen from a server-provided
  // search list) + quantity — price is never taken from the client.
  const product = await prisma.product.findUnique({
    where: { id: parsed.data.productId, status: "ACTIVE" },
    select: { id: true, name: true },
  });
  if (!product) return { error: "product_not_found" };

  const existing = access.draft.items.find(
    (i) => i.matchedProductId === product.id,
  );
  if (existing) {
    await prisma.telegramInvoiceDraftItem.update({
      where: { id: existing.id },
      data: { quantity: existing.quantity + parsed.data.quantity },
    });
  } else {
    await prisma.telegramInvoiceDraftItem.create({
      data: {
        draftId: access.draft.id,
        spokenName: product.name,
        quantity: parsed.data.quantity,
        matchStatus: "EXACT",
        matchedProductId: product.id,
        position: access.draft.items.length + 1,
      },
    });
  }
  const refreshed = await getDraftByToken(parsed.data.token);
  return { success: true, draft: await draftView(refreshed!) };
}

export async function setTelegramDraftPaymentAction(
  input: unknown,
): Promise<{ error: string } | { success: true; draft: TelegramDraftView }> {
  const parsed = miniAppSetPaymentSchema.safeParse(input);
  if (!parsed.success) return { error: "invalid_input" };
  const access = await requireMiniAppAccess(parsed.data);
  if (!access.ok) return { error: access.error };

  const patch = buildPaymentPatch(
    {
      status: parsed.data.status,
      amount: parsed.data.amount ?? null,
      method: parsed.data.method ?? null,
    },
    { paymentMethod: access.draft.paymentMethod },
  );
  if (!patch) return { error: "invalid_input" };

  await prisma.telegramInvoiceDraft.update({
    where: { id: access.draft.id },
    data: patch,
  });
  const refreshed = await getDraftByToken(parsed.data.token);
  return { success: true, draft: await draftView(refreshed!) };
}

export async function pickTelegramDraftCandidateAction(
  input: unknown,
): Promise<{ error: string } | { success: true; draft: TelegramDraftView }> {
  const parsed = miniAppPickCandidateSchema.safeParse(input);
  if (!parsed.success) return { error: "invalid_input" };
  const access = await requireMiniAppAccess(parsed.data);
  if (!access.ok) return { error: access.error };

  const item = access.draft.items.find((i) => i.id === parsed.data.itemId);
  if (!item || !item.candidateProductIds.includes(parsed.data.productId)) {
    return { error: "invalid_candidate" };
  }
  await pickCandidateForItem(parsed.data.itemId, parsed.data.productId);
  const refreshed = await getDraftByToken(parsed.data.token);
  return { success: true, draft: await draftView(refreshed!) };
}

export async function confirmTelegramInvoiceDraft(
  input: unknown,
): Promise<{ error: string } | { success: true; invoiceId: string }> {
  const parsed = miniAppBaseSchema.safeParse(input);
  if (!parsed.success) return { error: "invalid_input" };
  const access = await requireMiniAppAccess(parsed.data);
  if (!access.ok) return { error: access.error };

  const result = await confirmDraft(access.draft.id, access.adminId);
  if (!result.ok) return { error: result.reason };

  revalidatePath("/dashboard/invoices");
  revalidatePath("/dashboard/products");
  revalidatePath("/dashboard/inventory");
  return { success: true, invoiceId: result.invoiceId };
}

export async function cancelTelegramInvoiceDraft(
  input: unknown,
): Promise<{ error: string } | { success: true }> {
  const parsed = miniAppBaseSchema.safeParse(input);
  if (!parsed.success) return { error: "invalid_input" };
  const access = await requireMiniAppAccess(parsed.data);
  if (!access.ok) return { error: access.error };

  await cancelDraft(access.draft.id);
  return { success: true };
}
