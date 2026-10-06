import "server-only";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { createInvoice } from "@/features/invoices/actions";
import { normalizeText, textScore } from "@/lib/text-match";
import { getProductsForVoiceMatching } from "@/features/telegram/queries";
import {
  indexProductsForVoice,
  matchSpokenProduct,
  type VoiceMatch,
} from "@/features/telegram/matching";
import type { ExtractedIntent } from "@/features/telegram/schema";
import { computePaymentStatus } from "@/lib/money";
import type {
  PaymentMethod,
  PaymentStatus,
  TelegramDraftStatus,
  TelegramMatchStatus,
} from "@/generated/prisma/enums";

export const DRAFT_TTL_MINUTES = 30;

export function generateDraftToken(): string {
  return randomUUID();
}

const draftWithItemsInclude = {
  items: {
    orderBy: { position: "asc" as const },
    include: {
      matchedProduct: {
        select: { id: true, name: true, price1: true, status: true },
      },
    },
  },
  customer: { select: { id: true, name: true, phone: true, email: true } },
} as const;

export type DraftWithItems = Awaited<
  ReturnType<typeof getActiveDraftForAccount>
>;

export async function getActiveDraftForAccount(telegramAccountId: string) {
  return prisma.telegramInvoiceDraft.findFirst({
    where: {
      telegramAccountId,
      status: "PENDING",
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
    include: draftWithItemsInclude,
  });
}

export async function getDraftByToken(token: string) {
  return prisma.telegramInvoiceDraft.findUnique({
    where: { token },
    include: draftWithItemsInclude,
  });
}

const MATCH_STATUS_RANK: Record<VoiceMatch["status"], number> = {
  EXACT: 3,
  STRONG: 2,
  AMBIGUOUS: 1,
  NOT_FOUND: 0,
};

function bestVoiceMatch(a: VoiceMatch, b: VoiceMatch | null): VoiceMatch {
  if (!b) return a;
  const rankA = MATCH_STATUS_RANK[a.status];
  const rankB = MATCH_STATUS_RANK[b.status];
  if (rankB !== rankA) return rankB > rankA ? b : a;
  const scoreA = a.candidates[0]?.score ?? 0;
  const scoreB = b.candidates[0]?.score ?? 0;
  return scoreB > scoreA ? b : a;
}

async function matchIntentItems(
  items: {
    spokenName: string | null;
    spokenNameAlt?: string | null;
    quantity: number | null;
  }[],
) {
  const products = await getProductsForVoiceMatching();
  const indexed = indexProductsForVoice(products);

  return items
    .filter((item) => item.spokenName && item.spokenName.trim())
    .map((item, index) => {
      const spokenName = item.spokenName!.trim();
      const primary = matchSpokenProduct(spokenName, indexed);
      const altText = item.spokenNameAlt?.trim();
      const alt = altText ? matchSpokenProduct(altText, indexed) : null;
      const match = bestVoiceMatch(primary, alt);
      const quantity =
        item.quantity != null && Math.round(item.quantity) > 0
          ? Math.round(item.quantity)
          : 1;
      return {
        spokenName,
        quantity,
        matchStatus: match.status as TelegramMatchStatus,
        matchedProductId: match.matchedProductId,
        candidateProductIds: match.candidates.map((c) => c.productId),
        position: index + 1,
      };
    });
}

export type PaymentInput = {
  status: "PAID" | "UNPAID" | "PARTIAL" | null;
  amount: number | null;
  method: PaymentMethod | null;
};

export function buildPaymentPatch(
  input: PaymentInput,
  current: {
    paymentMethod: PaymentMethod | null;
  },
) {
  const amount =
    input.amount != null && input.amount > 0
      ? Math.round(input.amount * 100) / 100
      : null;
  const status = input.status ?? (amount != null ? "PARTIAL" : null);

  if (status === "UNPAID") {
    return { paidInFull: false, paymentAmount: null, paymentMethod: null };
  }
  if (status === "PAID") {
    return {
      paidInFull: true,
      paymentAmount: null,
      paymentMethod: input.method ?? current.paymentMethod ?? "CASH",
    };
  }
  if (status === "PARTIAL" && amount != null) {
    return {
      paidInFull: false,
      paymentAmount: amount,
      paymentMethod: input.method ?? current.paymentMethod ?? "CASH",
    };
  }
  if (input.method) return { paymentMethod: input.method };
  return null;
}

function intentPayment(intent: ExtractedIntent): PaymentInput {
  return {
    status: intent.paymentStatus,
    amount: intent.paymentAmount,
    method: intent.paymentMethod,
  };
}

export async function createDraftFromIntent(
  telegramAccountId: string,
  intent: ExtractedIntent,
  rawTranscript: string,
) {
  const matched = await matchIntentItems(intent.items);

  await prisma.telegramInvoiceDraft.updateMany({
    where: { telegramAccountId, status: "PENDING" },
    data: { status: "EXPIRED" },
  });

  const draft = await prisma.telegramInvoiceDraft.create({
    data: {
      token: generateDraftToken(),
      telegramAccountId,
      rawTranscript,
      expiresAt: new Date(Date.now() + DRAFT_TTL_MINUTES * 60_000),
      items: { create: matched },
      ...(buildPaymentPatch(intentPayment(intent), { paymentMethod: null }) ??
        {}),
    },
    include: draftWithItemsInclude,
  });
  return draft;
}

export type ApplyIntentResult =
  | {
      ok: true;
      draft: NonNullable<DraftWithItems>;
      /** Names the speaker asked to remove/change that aren't in the draft. */
      unmatched: string[];
    }
  | { ok: false; reason: "no_active_draft" };

export async function applyIntentToActiveDraft(
  telegramAccountId: string,
  intent: ExtractedIntent,
): Promise<ApplyIntentResult> {
  const active = await getActiveDraftForAccount(telegramAccountId);
  if (!active) return { ok: false, reason: "no_active_draft" };
  const unmatched: string[] = [];

  if (intent.action === "ADD_ITEM") {
    const matched = await matchIntentItems(intent.items);
    for (const item of matched) {
      const existing = item.matchedProductId
        ? active.items.find((i) => i.matchedProductId === item.matchedProductId)
        : undefined;
      if (existing) {
        await prisma.telegramInvoiceDraftItem.update({
          where: { id: existing.id },
          data: { quantity: existing.quantity + item.quantity },
        });
      } else {
        await prisma.telegramInvoiceDraftItem.create({
          data: {
            ...item,
            draftId: active.id,
            position: active.items.length + 1,
          },
        });
      }
    }
  } else if (intent.action === "REMOVE_ITEM") {
    for (const item of intent.items) {
      const target = findBestDraftItemMatch(
        active.items,
        item.spokenName,
        item.spokenNameAlt,
      );
      if (target) {
        await prisma.telegramInvoiceDraftItem.delete({
          where: { id: target.id },
        });
      } else if (item.spokenName) {
        unmatched.push(item.spokenName);
      }
    }
  } else if (intent.action === "SET_QUANTITY") {
    for (const item of intent.items) {
      const target = findBestDraftItemMatch(
        active.items,
        item.spokenName,
        item.spokenNameAlt,
      );
      if (!target && item.spokenName) unmatched.push(item.spokenName);
      if (target && item.quantity != null && Math.round(item.quantity) > 0) {
        await prisma.telegramInvoiceDraftItem.update({
          where: { id: target.id },
          data: { quantity: Math.round(item.quantity) },
        });
      }
    }
  }

  const paymentPatch = buildPaymentPatch(intentPayment(intent), {
    paymentMethod: active.paymentMethod,
  });
  await prisma.telegramInvoiceDraft.update({
    where: { id: active.id },
    data: paymentPatch ?? {},
  });
  const refreshed = await getDraftByToken(active.token);
  return { ok: true, draft: refreshed!, unmatched };
}

function findBestDraftItemMatch(
  items: NonNullable<DraftWithItems>["items"],
  spokenName: string | null,
  spokenNameAlt?: string | null,
) {
  if (items.length === 0) return null;
  const queries = [spokenName, spokenNameAlt]
    .filter((s): s is string => Boolean(s && s.trim()))
    .map((s) => normalizeText(s));
  if (queries.length === 0) return null;

  let best: { item: (typeof items)[number]; score: number } | null = null;
  for (const item of items) {
    const label = normalizeText(item.matchedProduct?.name ?? item.spokenName);
    const score = Math.max(...queries.map((q) => textScore(q, label)));
    if (!best || score > best.score) best = { item, score };
  }
  return best && best.score >= 0.3 ? best.item : null;
}

export async function startRespeak(draftId: string, itemId: string) {
  const updated = await prisma.telegramInvoiceDraft.updateMany({
    where: { id: draftId, status: "PENDING" },
    data: { respeakItemId: itemId },
  });
  return updated.count > 0;
}

export async function clearRespeak(draftId: string) {
  await prisma.telegramInvoiceDraft.update({
    where: { id: draftId },
    data: { respeakItemId: null },
  });
}

export async function respeakItem(
  itemId: string,
  spokenName: string,
  spokenNameAlt?: string | null,
  /** New quantity for the line; null/undefined keeps the current one. */
  quantity?: number | null,
) {
  const item = await prisma.telegramInvoiceDraftItem.findUnique({
    where: { id: itemId },
  });
  if (!item) return false;
  const [matched] = await matchIntentItems([
    { spokenName, spokenNameAlt, quantity: quantity ?? item.quantity },
  ]);
  if (!matched) return false;
  await prisma.telegramInvoiceDraftItem.update({
    where: { id: itemId },
    data: {
      spokenName: matched.spokenName,
      quantity: matched.quantity,
      matchStatus: matched.matchStatus,
      matchedProductId: matched.matchedProductId,
      candidateProductIds: matched.candidateProductIds,
    },
  });
  return true;
}

export async function setItemQuantity(itemId: string, quantity: number) {
  const q = Math.round(quantity);
  if (!(q > 0)) return false;
  await prisma.telegramInvoiceDraftItem.update({
    where: { id: itemId },
    data: { quantity: q },
  });
  return true;
}

export async function deleteDraftItem(itemId: string) {
  await prisma.telegramInvoiceDraftItem.delete({ where: { id: itemId } });
}

export async function pickCandidateForItem(itemId: string, productId: string) {
  const item = await prisma.telegramInvoiceDraftItem.findUnique({
    where: { id: itemId },
  });
  if (!item || !item.candidateProductIds.includes(productId)) return null;
  return prisma.telegramInvoiceDraftItem.update({
    where: { id: itemId },
    data: { matchedProductId: productId, matchStatus: "STRONG" },
  });
}

export async function setDraftCustomer(draftId: string, customerId: string) {
  const updated = await prisma.telegramInvoiceDraft.updateMany({
    where: { id: draftId, status: "PENDING" },
    data: { customerId },
  });
  return updated.count > 0;
}

export type DraftPayment = {
  method: PaymentMethod | null;
  paid: number;
  remaining: number;
  status: PaymentStatus;
};

export type DraftTotals = {
  total: number;
  hasUnresolvedItems: boolean;
  payment: DraftPayment;
  lines: {
    itemId: string;
    label: string;
    quantity: number;
    unitPrice: number | null;
    lineTotal: number | null;
    matchStatus: TelegramMatchStatus;
  }[];
};

export function computeDraftTotals(
  draft: NonNullable<DraftWithItems>,
): DraftTotals {
  let total = 0;
  let hasUnresolvedItems = false;
  const lines = draft.items.map((item) => {
    const product =
      item.matchedProductId && item.matchedProduct?.status === "ACTIVE"
        ? item.matchedProduct
        : null;
    const unitPrice = product ? Number(product.price1) : null;
    const quantity = item.quantity;
    const lineTotal = unitPrice != null ? unitPrice * quantity : null;
    if (lineTotal != null) total += lineTotal;
    if (
      !product ||
      item.matchStatus === "AMBIGUOUS" ||
      item.matchStatus === "NOT_FOUND"
    ) {
      hasUnresolvedItems = true;
    }
    return {
      itemId: item.id,
      label: product?.name ?? item.spokenName,
      quantity,
      unitPrice,
      lineTotal,
      matchStatus: item.matchStatus,
    };
  });
  const paid = draft.paidInFull
    ? total
    : Math.min(Number(draft.paymentAmount ?? 0), total);
  const payment: DraftPayment = {
    method: draft.paymentMethod,
    paid,
    remaining: Math.max(0, total - paid),
    status: computePaymentStatus(total, paid),
  };
  return { total, hasUnresolvedItems, payment, lines };
}

/** Plain-text snapshot of the open draft for the AI prompt, so the model
 * knows what is already there (items, customer, payment) and can choose the
 * right action and the right existing line. Names only — no ids, and prices
 * are left out; the server stays the source of truth for those. */
export function describeDraftForPrompt(
  draft: NonNullable<DraftWithItems>,
): string {
  const totals = computeDraftTotals(draft);
  const items = totals.lines.length
    ? totals.lines
        .map((line) => {
          const flag =
            line.matchStatus === "AMBIGUOUS" || line.matchStatus === "NOT_FOUND"
              ? " (unresolved)"
              : "";
          return `- ${line.quantity} x ${line.label}${flag}`;
        })
        .join("\n")
    : "- (no items yet)";
  const payment =
    totals.payment.status === "PAID"
      ? "paid in full"
      : totals.payment.paid > 0
        ? `partially paid (${totals.payment.paid} of ${totals.total})`
        : "unpaid";
  return `Customer: ${draft.customer?.name ?? "not set"}\nItems:\n${items}\nPayment: ${payment}`;
}

export type ConfirmDraftResult =
  | { ok: true; invoiceId: string; alreadyExists?: boolean }
  | {
      ok: false;
      reason:
        | "not_pending"
        | "no_customer"
        | "unresolved_items"
        | "empty"
        | "invoice_error";
      message?: string;
    };
export async function confirmDraft(
  draftId: string,
  adminId: string,
): Promise<ConfirmDraftResult> {
  const draft = await prisma.telegramInvoiceDraft.findUnique({
    where: { id: draftId },
    include: draftWithItemsInclude,
  });
  if (!draft) return { ok: false, reason: "not_pending" };

  if (draft.status !== "PENDING") {
    if (draft.invoiceId)
      return { ok: true, invoiceId: draft.invoiceId, alreadyExists: true };
    return { ok: false, reason: "not_pending" };
  }

  if (!draft.customerId || !draft.customer) {
    return { ok: false, reason: "no_customer" };
  }
  if (draft.items.length === 0) return { ok: false, reason: "empty" };

  const totals = computeDraftTotals(draft);
  if (totals.hasUnresolvedItems)
    return { ok: false, reason: "unresolved_items" };

  const items = totals.lines.map((line) => ({
    productId: draft.items.find((i) => i.id === line.itemId)!.matchedProductId!,
    name: line.label,
    quantity: line.quantity,
    unitPrice: line.unitPrice!,
  }));

  const result = await createInvoice(
    {
      language: "AR",
      customerId: draft.customer.id,
      customerName: draft.customer.name,
      customerPhone: draft.customer.phone,
      customerEmail: draft.customer.email ?? "",
      items,
      payments:
        totals.payment.paid > 0
          ? [
              {
                method: (totals.payment.method ?? "CASH") as
                  | "CASH"
                  | "BANK_TRANSFER"
                  | "CREDIT_CARD"
                  | "OTHER",
                amount: totals.payment.paid,
              },
            ]
          : [],
    },
    {
      redirect: false,
      posSaleToken: draft.token,
      actingAdminId: adminId,
      createdByBot: true,
    },
  );

  if (result.error || !result.invoiceId) {
    return { ok: false, reason: "invoice_error", message: result.error };
  }

  await prisma.telegramInvoiceDraft.update({
    where: { id: draft.id },
    data: {
      status: "CONFIRMED",
      confirmedAt: new Date(),
      invoiceId: result.invoiceId,
    },
  });

  return { ok: true, invoiceId: result.invoiceId };
}

export async function cancelDraft(draftId: string) {
  return prisma.telegramInvoiceDraft.updateMany({
    where: { id: draftId, status: "PENDING" },
    data: { status: "CANCELLED" },
  });
}

export type { TelegramDraftStatus };
