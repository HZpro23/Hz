import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/currency";
import { searchCustomers } from "@/features/customers/queries";
import {
  sendMessage,
  answerCallbackQuery,
  downloadTelegramFile,
  escapeTelegramHtml,
  type InlineKeyboard,
} from "@/features/telegram/bot-api";
import { transcribeVoice, GroqError } from "@/features/telegram/groq";
import { getVoiceHintPrompt } from "@/features/telegram/queries";
import { extractInvoiceIntent } from "@/features/telegram/intent";
import { recordMessageAndMaybeSummarize } from "@/features/telegram/conversation-memory";
import { DeepSeekError } from "@/lib/deepseek-error";
import {
  createDraftFromIntent,
  applyIntentToActiveDraft,
  getActiveDraftForAccount,
  getDraftByToken,
  computeDraftTotals,
  confirmDraft,
  cancelDraft,
  pickCandidateForItem,
  startRespeak,
  describeDraftForPrompt,
  clearRespeak,
  respeakItem,
  setItemQuantity,
  deleteDraftItem,
  buildPaymentPatch,
  type PaymentInput,
  setDraftCustomer,
  type DraftWithItems,
} from "@/features/telegram/draft";
import type { ExtractedIntent } from "@/features/telegram/schema";
import { botText, type BotText } from "@/features/telegram/bot-text";
import { normalizeText, textScore } from "@/lib/text-match";
import { ar } from "@/i18n/ar";
import type { PaymentMethod } from "@/generated/prisma/enums";

const APP_NAME = "HZ";

export const runtime = "nodejs";
export const maxDuration = 60;

// ---------------------------------------------------------------------------
// Minimal typed subset of the Telegram Update payload — only the fields this
// bot actually reads.
// ---------------------------------------------------------------------------

type TelegramUpdate = {
  update_id: number;
  message?: {
    message_id: number;
    from?: {
      id: number;
      first_name?: string;
      last_name?: string;
      username?: string;
    };
    chat: { id: number };
    text?: string;
    voice?: { file_id: string; mime_type?: string; file_size?: number };
  };
  callback_query?: {
    id: string;
    from: { id: number };
    message?: { chat: { id: number }; message_id: number };
    data?: string;
  };
};

type LinkedAccount = {
  id: string;
  adminId: string;
  conversationSummary: string | null;
};

function miniAppUrl(token: string): string | null {
  const base = process.env.APP_URL;
  if (!base) return null;
  return `${base.replace(/\/$/, "")}/telegram-app/${token}`;
}

function draftPreviewMessage(
  draft: NonNullable<DraftWithItems>,
  t: BotText,
): { text: string; replyMarkup: InlineKeyboard } {
  const totals = computeDraftTotals(draft);
  // The message is sent with parse_mode HTML, so names that come from the
  // catalog or the customer list must be escaped ("A&B", "<5kg>" would
  // otherwise make Telegram reject the whole message).
  const lines = totals.lines.map((line) => {
    const label = escapeTelegramHtml(line.label);
    if (line.matchStatus === "NOT_FOUND") {
      return `${line.quantity} × ${label}  ${t.notFoundSuffix}`;
    }
    if (line.matchStatus === "AMBIGUOUS") {
      return `${line.quantity} × ${label}  ${t.ambiguousSuffix}`;
    }
    return `${line.quantity} × ${label}   ${formatCurrency(line.lineTotal ?? 0)}`;
  });
  const customerLine = `${t.customerLabel}: ${
    draft.customer ? escapeTelegramHtml(draft.customer.name) : t.customerNotSet
  }`;

  const text = [
    t.draftHeader,
    customerLine,
    "",
    ...lines,
    "",
    `${t.totalLabel}: ${formatCurrency(totals.total)}`,
    `${t.paymentStateLabel}: ${ar.statusLabels.paymentStatus[totals.payment.status]}`,
    totals.payment.paid > 0
      ? `${t.paidLabel}: ${formatCurrency(totals.payment.paid)}` +
        (totals.payment.method
          ? ` (${ar.statusLabels.paymentMethod[totals.payment.method]})`
          : "")
      : "",
    totals.payment.paid > 0 && totals.payment.remaining > 0
      ? `${t.remainingLabel}: ${formatCurrency(totals.payment.remaining)}`
      : "",
    !draft.customerId ? `\n${t.needsCustomerNote}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const url = miniAppUrl(draft.token);
  const buttons: InlineKeyboard["inline_keyboard"] = [];
  if (url) {
    buttons.push([{ text: t.reviewEditButton, web_app: { url } }]);
  }
  buttons.push([
    { text: t.addItemsButton, callback_data: "additems" },
    { text: t.editItemsButton, callback_data: "edititems" },
  ]);
  buttons.push([
    { text: t.editCustomerButton, callback_data: "editcust" },
    { text: t.editPaymentButton, callback_data: "editpay" },
  ]);
  buttons.push([
    { text: t.createInvoiceButton, callback_data: `confirm:${draft.token}` },
    { text: t.cancelButtonLabel, callback_data: `cancel:${draft.token}` },
  ]);

  return { text, replyMarkup: { inline_keyboard: buttons } };
}

async function sendAmbiguousPickers(
  chatId: number,
  draft: NonNullable<DraftWithItems>,
  t: BotText,
) {
  for (const item of draft.items) {
    if (item.matchStatus !== "AMBIGUOUS" && item.matchStatus !== "NOT_FOUND") {
      continue;
    }
    const candidates =
      item.matchStatus === "AMBIGUOUS" && item.candidateProductIds.length > 0
        ? await prisma.product.findMany({
            where: { id: { in: item.candidateProductIds } },
            select: { id: true, name: true },
          })
        : [];
    const prefix =
      candidates.length > 0
        ? t.ambiguousPickPromptPrefix
        : t.notFoundPickPromptPrefix;
    await sendMessage({
      chatId,
      text: `${prefix} "${escapeTelegramHtml(item.spokenName)}"؟`,
      replyMarkup: {
        inline_keyboard: [
          ...candidates.map((c) => [
            { text: c.name, callback_data: `pick:${item.id}:${c.id}` },
          ]),
          [{ text: t.respeakButton, callback_data: `respeak:${item.id}` }],
        ],
      },
    });
  }
}

/** Tells the user which requested remove/change targets weren't in the draft,
 * instead of silently re-sending an unchanged preview. */
async function notifyUnmatched(chatId: number, names: string[], t: BotText) {
  if (names.length === 0) return;
  await sendMessage({
    chatId,
    text: `${t.itemNotInDraft} ${names.map((n) => `"${escapeTelegramHtml(n)}"`).join("، ")}`,
  });
}

async function replyDraft(
  chatId: number,
  draft: NonNullable<DraftWithItems> | null,
  t: BotText,
) {
  if (!draft) {
    await sendMessage({ chatId, text: t.noActiveDraftMessage });
    return;
  }
  const { text, replyMarkup } = draftPreviewMessage(draft, t);
  await sendMessage({ chatId, text, replyMarkup });
  await sendAmbiguousPickers(chatId, draft, t);
}

async function handleStartCommand(
  chatId: number,
  telegramUserId: bigint,
  text: string,
  from: { first_name?: string; last_name?: string; username?: string },
) {
  const t = botText;
  const token = text.split(/\s+/)[1]?.trim();
  if (!token) {
    await sendMessage({ chatId, text: t.startNoToken });
    return;
  }

  const linkToken = await prisma.telegramLinkToken.findUnique({
    where: { token },
  });
  if (!linkToken || linkToken.consumedAt || linkToken.expiresAt < new Date()) {
    await sendMessage({ chatId, text: t.startTokenExpired });
    return;
  }

  const name =
    [from.first_name, from.last_name].filter(Boolean).join(" ") || null;
  const username = from.username ?? null;

  // Several Telegram accounts can link to the same admin. Re-linking an
  // already-linked Telegram user just refreshes its name/username.
  try {
    await prisma.$transaction([
      prisma.telegramAccount.upsert({
        where: { telegramUserId },
        create: { telegramUserId, adminId: linkToken.adminId, name, username },
        update: { adminId: linkToken.adminId, name, username, isActive: true },
      }),
      prisma.telegramLinkToken.update({
        where: { id: linkToken.id },
        data: { consumedAt: new Date() },
      }),
    ]);
  } catch {
    await sendMessage({ chatId, text: t.startAlreadyLinkedToOther });
    return;
  }

  await sendMessage({ chatId, text: t.startLinkedGreeting });
}

// ---------------------------------------------------------------------------
// Voice/text intent handling for an already-linked, language-set account.
// ---------------------------------------------------------------------------

async function handleIntentMessage(
  chatId: number,
  adminId: string,
  telegramAccountId: string,
  intent: ExtractedIntent,
  rawTranscript: string,
) {
  const t = botText;

  if (intent.action === "CREATE_INVOICE") {
    const draft = await createDraftFromIntent(
      telegramAccountId,
      intent,
      rawTranscript,
    );
    await replyDraft(chatId, draft, t);
    return;
  }

  if (intent.action === "CONFIRM") {
    const active = await getActiveDraftForAccount(telegramAccountId);
    if (!active) {
      await sendMessage({ chatId, text: t.noActiveDraftToConfirm });
      return;
    }
    await confirmActiveDraft(chatId, active.id, adminId);
    return;
  }

  if (intent.action === "CANCEL") {
    const active = await getActiveDraftForAccount(telegramAccountId);
    if (!active) {
      await sendMessage({ chatId, text: t.noActiveDraftToCancel });
      return;
    }
    await cancelDraft(active.id);
    await sendMessage({ chatId, text: t.draftCancelled });
    return;
  }

  if (intent.action === "SET_CUSTOMER") {
    // Naming the customer with no draft open starts an empty draft for them.
    if (!(await getActiveDraftForAccount(telegramAccountId))) {
      await createDraftFromIntent(
        telegramAccountId,
        { ...intent, items: [] },
        rawTranscript,
      );
      await sendMessage({ chatId, text: t.newDraftStarted });
    }
    await handleSetCustomer(
      chatId,
      telegramAccountId,
      intent.customerQuery,
      intent.customerQueryAlt,
      t,
    );
    return;
  }

  if (intent.action === "WHO_ARE_YOU") {
    await sendMessage({
      chatId,
      text: t.identityReplyTemplate.replace("{appName}", APP_NAME),
    });
    return;
  }

  if (intent.action === "CHAT") {
    await sendMessage({
      chatId,
      text: intent.reply
        ? escapeTelegramHtml(intent.reply)
        : t.unknownIntentHelp,
    });
    return;
  }

  if (intent.action === "UNKNOWN") {
    await sendMessage({ chatId, text: t.unknownIntentHelp });
    return;
  }

  // ADD_ITEM / REMOVE_ITEM / SET_QUANTITY / GET_TOTAL all act on the active draft.
  const result = await applyIntentToActiveDraft(telegramAccountId, intent);
  if (!result.ok) {
    // An update with no draft open ("add two soap", "set soap to 5",
    // "paid in cash") starts a new draft from what was said instead of
    // refusing. Remove / total have nothing to act on, so they still ask.
    const startsDraft =
      ((intent.action === "ADD_ITEM" || intent.action === "SET_QUANTITY") &&
        intent.items.length > 0) ||
      intent.action === "SET_PAYMENT";
    if (startsDraft) {
      const draft = await createDraftFromIntent(
        telegramAccountId,
        intent,
        rawTranscript,
      );
      await sendMessage({ chatId, text: t.newDraftStarted });
      await replyDraft(chatId, draft, t);
      return;
    }
    await sendMessage({ chatId, text: t.noActiveDraftForEdit });
    return;
  }
  await notifyUnmatched(chatId, result.unmatched, t);
  await replyDraft(chatId, result.draft, t);
}

async function handleSetCustomer(
  chatId: number,
  telegramAccountId: string,
  customerQuery: string | null,
  customerQueryAlt: string | null,
  t: BotText,
) {
  const active = await getActiveDraftForAccount(telegramAccountId);
  if (!active) {
    await sendMessage({ chatId, text: t.noActiveDraftForEdit });
    return;
  }

  const query = customerQuery?.trim();
  const altQuery = customerQueryAlt?.trim();
  if (!query && !altQuery) {
    await sendMessage({ chatId, text: t.customerNotFound });
    return;
  }

  let items = query ? (await searchCustomers(query)).slice(0, 5) : [];
  if (items.length === 0 && altQuery) {
    items = (await searchCustomers(altQuery)).slice(0, 5);
  }
  if (items.length === 0) {
    await sendMessage({ chatId, text: t.customerNotFound });
    return;
  }

  if (items.length === 1) {
    await setDraftCustomer(active.id, items[0].id);
    await sendMessage({
      chatId,
      text: `${t.customerSetPrefix} ${escapeTelegramHtml(items[0].name)}`,
    });
    const refreshed = await getDraftByToken(active.token);
    await replyDraft(chatId, refreshed, t);
    return;
  }

  await sendMessage({
    chatId,
    text: t.customerAmbiguousPrompt,
    replyMarkup: {
      inline_keyboard: items.map((c) => [
        { text: `${c.name} — ${c.phone}`, callback_data: `setcust:${c.id}` },
      ]),
    },
  });
}

async function confirmActiveDraft(
  chatId: number,
  draftId: string,
  adminId: string,
) {
  const t = botText;
  const result = await confirmDraft(draftId, adminId);
  if (result.ok) {
    await sendMessage({
      chatId,
      text: `${t.invoiceCreatedPrefix} (${result.invoiceId})`,
    });
    return;
  }
  const messages: Record<typeof result.reason, string> = {
    not_pending: t.confirmNotPending,
    no_customer: t.confirmNoCustomer,
    unresolved_items: t.confirmUnresolvedItems,
    empty: t.confirmEmpty,
    invoice_error: result.message ?? t.confirmInvoiceErrorFallback,
  };
  await sendMessage({ chatId, text: messages[result.reason] });
}

// ---------------------------------------------------------------------------
// Update dispatch
// ---------------------------------------------------------------------------

async function resolveLinkedAccount(
  telegramUserId: bigint,
): Promise<LinkedAccount | null> {
  const account = await prisma.telegramAccount.findUnique({
    where: { telegramUserId },
  });
  if (!account || !account.isActive) return null;
  // Re-check against the DB every time: the linked Admin must still exist.
  const admin = await prisma.admin.findUnique({
    where: { id: account.adminId },
    select: { id: true },
  });
  if (!admin) return null;
  return {
    id: account.id,
    adminId: account.adminId,
    conversationSummary: account.conversationSummary,
  };
}

async function handleMessage(message: NonNullable<TelegramUpdate["message"]>) {
  const chatId = message.chat.id;
  const fromId = message.from?.id;
  if (!fromId) return;
  const telegramUserId = BigInt(fromId);

  if (message.text?.startsWith("/start")) {
    await handleStartCommand(
      chatId,
      telegramUserId,
      message.text,
      message.from ?? {},
    );
    return;
  }

  const account = await resolveLinkedAccount(telegramUserId);
  if (!account) {
    await sendMessage({ chatId, text: botText.notLinkedOrForbidden });
    return;
  }

  const t = botText;

  let text: string | null = message.text ?? null;
  if (!text && message.voice) {
    try {
      if (
        message.voice.file_size &&
        message.voice.file_size > 15 * 1024 * 1024
      ) {
        await sendMessage({ chatId, text: t.voiceTooLarge });
        return;
      }
      const { buffer } = await downloadTelegramFile(message.voice.file_id);
      // The hint only improves spelling of likely words — never block the
      // transcription if building it fails.
      const hint = await getVoiceHintPrompt().catch(() => undefined);
      text = await transcribeVoice(
        buffer,
        "voice.ogg",
        message.voice.mime_type ?? "audio/ogg",
        hint,
      );
      console.log("[telegram/webhook] voice transcribed:", text);
    } catch (error) {
      const code = error instanceof GroqError ? error.code : "api";
      console.error("[telegram/webhook] voice transcription failed", error);
      await sendMessage({
        chatId,
        text: code === "too_large" ? t.voiceTooLarge : t.voiceTranscribeFailed,
      });
      return;
    }
  }

  if (!text) return;

  const pending = await getActiveDraftForAccount(account.id);

  let intent: ExtractedIntent | null = null;
  try {
    intent = await extractInvoiceIntent(
      text,
      account.conversationSummary,
      pending ? draftPromptWithFocus(pending) : null,
    );
    console.log("[telegram/webhook] intent:", JSON.stringify(intent));
  } catch (error) {
    console.error("[telegram/webhook] intent extraction failed", error);
    // A pending correction can still use the raw text without the model.
    if (!pending?.respeakItemId) {
      const code = error instanceof DeepSeekError ? error.code : "api";
      await sendMessage({
        chatId,
        text: code === "config" ? t.serviceNotConfigured : t.understandFailed,
      });
      return;
    }
  }

  if (
    pending?.respeakItemId &&
    intent?.action !== "CONFIRM" &&
    intent?.action !== "CANCEL"
  ) {
    await handleRespeak(chatId, account, pending, text, intent);
    return;
  }
  if (pending?.respeakItemId) await clearRespeak(pending.id);
  if (!intent) return;

  try {
    await recordMessageAndMaybeSummarize(account.id, text);
  } catch (error) {
    console.error(
      "[telegram/webhook] conversation memory update failed",
      error,
    );
  }

  await handleIntentMessage(chatId, account.adminId, account.id, intent, text);
}

// `TelegramInvoiceDraft.respeakItemId` normally holds a draft item id; these
// sentinels reuse the same "next message is a correction" slot for the
// customer and the payment instead of a product.
const PENDING_CUSTOMER = "__customer__";
const PENDING_PAYMENT = "__payment__";
const PENDING_ADD_ITEMS = "__add_items__";

/** The user pressed "add items" and then spoke or typed the products to add.
 * A bare product list is ADD_ITEM here even if the model called it
 * CREATE_INVOICE, since a new invoice isn't what they asked for. */
async function handleAddItems(
  chatId: number,
  account: LinkedAccount,
  intent: ExtractedIntent | null,
) {
  const t = botText;
  const action = intent?.action === "CREATE_INVOICE" ? "ADD_ITEM" : intent?.action;
  if (!intent || action !== "ADD_ITEM" || intent.items.length === 0) {
    await sendMessage({ chatId, text: t.itemsNotUnderstood });
    return;
  }
  const result = await applyIntentToActiveDraft(account.id, {
    ...intent,
    action: "ADD_ITEM",
  });
  if (!result.ok) {
    await sendMessage({ chatId, text: t.noActiveDraftForEdit });
    return;
  }
  await replyDraft(chatId, result.draft, t);
}

/** The user tapped ✏️ on one product card and then spoke or typed. Whatever
 * they say edits ONLY that line: a number sets its quantity, a product name
 * swaps the product (keeping the quantity unless a number is said too), and
 * a remove word deletes it. */
async function handleItemEdit(
  chatId: number,
  account: LinkedAccount,
  draft: NonNullable<DraftWithItems>,
  itemId: string,
  text: string,
  intent: ExtractedIntent | null,
) {
  const t = botText;
  if (!draft.items.some((i) => i.id === itemId)) {
    await sendMessage({ chatId, text: t.callbackNotFound });
    return;
  }

  if (intent?.action === "REMOVE_ITEM") {
    await deleteDraftItem(itemId);
    await sendMessage({ chatId, text: t.itemDeleted });
    await replyDraft(chatId, await getActiveDraftForAccount(account.id), t);
    return;
  }

  const first = intent?.items[0];
  const said =
    first?.quantity != null && Math.round(first.quantity) > 0
      ? Math.round(first.quantity)
      : null;
  const current = draft.items.find((i) => i.id === itemId)!;
  const currentLabel = normalizeText(
    current.matchedProduct?.name ?? current.spokenName,
  );
  // A name that isn't (a variant of) the line being edited means "swap the
  // product", even if the model called it SET_QUANTITY.
  const namesAnotherProduct =
    !!first?.spokenName &&
    textScore(normalizeText(first.spokenName), currentLabel) < 0.5 &&
    textScore(normalizeText(first.spokenNameAlt), currentLabel) < 0.5;
  let ok = false;

  if (!namesAnotherProduct && (intent?.action === "SET_QUANTITY" || (!first?.spokenName && said))) {
    ok = said != null && (await setItemQuantity(itemId, said));
  } else {
    // Without the model, a bare number is a quantity and anything else is
    // taken as the new name.
    const bare = Number(text.replace(/[^\d.,]/g, "").replace(",", "."));
    if (!intent && Number.isFinite(bare) && bare > 0 && /^[\s\d.,]+$/.test(text)) {
      ok = await setItemQuantity(itemId, bare);
    } else {
      const name = first?.spokenName ?? text.trim();
      // The model defaults a missing quantity to 1, so only an explicit
      // number above 1 overrides the line's current quantity on a swap.
      ok =
        name.length > 0 &&
        (await respeakItem(
          itemId,
          name,
          first?.spokenNameAlt,
          said != null && said > 1 ? said : null,
        ));
    }
  }

  if (!ok) {
    await sendMessage({ chatId, text: t.respeakNotUnderstood });
    return;
  }
  await replyDraft(chatId, await getActiveDraftForAccount(account.id), t);
}

/** The draft snapshot for the AI, plus — when the user tapped ✏️ on one
 * product — a note that this message edits only that line. */
function draftPromptWithFocus(draft: NonNullable<DraftWithItems>): string {
  const base = describeDraftForPrompt(draft);
  const target = draft.respeakItemId
    ? computeDraftTotals(draft).lines.find((l) => l.itemId === draft.respeakItemId)
    : undefined;
  if (!target) return base;
  return `${base}\nEDITING ONLY THIS LINE: ${target.quantity} x ${target.label}. Treat the message as an edit of this single line: a number or number word alone = SET_QUANTITY (items[0].quantity = that number); a product name, even alone and even if it is already another line = replace this line's product (ADD_ITEM with that name, quantity null unless a number is also said); a name AND a number = replace the product and set that quantity (ADD_ITEM with that name and quantity); a remove word = REMOVE_ITEM. Number words (جوج=2, تلاتة=3, ربعة=4, خمسة=5...) are quantities, never part of a product name.`;
}

/** One message ("card") per product so each can be edited or deleted on its
 * own. Capped so a huge draft doesn't flood the chat. */
async function sendItemCards(
  chatId: number,
  draft: NonNullable<DraftWithItems>,
  t: BotText,
) {
  const totals = computeDraftTotals(draft);
  if (totals.lines.length === 0) {
    await sendMessage({ chatId, text: t.noItemsToEdit });
    return;
  }
  await sendMessage({ chatId, text: t.editCardsHeader });
  for (const line of totals.lines.slice(0, 20)) {
    const flag =
      line.matchStatus === "NOT_FOUND"
        ? `  ${t.notFoundSuffix}`
        : line.matchStatus === "AMBIGUOUS"
          ? `  ${t.ambiguousSuffix}`
          : line.lineTotal != null
            ? `   ${formatCurrency(line.lineTotal)}`
            : "";
    await sendMessage({
      chatId,
      text: `${line.quantity} × ${escapeTelegramHtml(line.label)}${flag}`,
      replyMarkup: {
        inline_keyboard: [
          [
            { text: t.itemEditButton, callback_data: `itemedit:${line.itemId}` },
            { text: t.itemDeleteButton, callback_data: `itemdel:${line.itemId}` },
          ],
        ],
      },
    });
  }
}

async function handleRespeakCustomer(
  chatId: number,
  account: LinkedAccount,
  text: string,
  intent: ExtractedIntent | null,
) {
  let query = text.trim();
  let alt: string | null = null;
  if (intent?.customerQuery) {
    query = intent.customerQuery;
    alt = intent.customerQueryAlt;
  } else if (intent?.items[0]?.spokenName) {
    query = intent.items[0].spokenName;
    alt = intent.items[0].spokenNameAlt;
  }
  await handleSetCustomer(chatId, account.id, query, alt, botText);
}

async function handleRespeakPayment(
  chatId: number,
  account: LinkedAccount,
  draft: NonNullable<DraftWithItems>,
  text: string,
  intent: ExtractedIntent | null,
) {
  const t = botText;
  const input: PaymentInput = {
    status: intent?.paymentStatus ?? null,
    amount: intent?.paymentAmount ?? null,
    method: intent?.paymentMethod ?? null,
  };
  if (!input.status && input.amount == null) {
    const n = Number(text.replace(/[^\d.,]/g, "").replace(",", "."));
    if (Number.isFinite(n) && n > 0) input.amount = n;
  }
  const patch = buildPaymentPatch(input, {
    paymentMethod: draft.paymentMethod,
  });
  if (!patch) {
    await sendMessage({ chatId, text: t.paymentNotUnderstood });
    return;
  }
  await prisma.telegramInvoiceDraft.update({
    where: { id: draft.id },
    data: patch,
  });
  await replyDraft(chatId, await getActiveDraftForAccount(account.id), t);
}

async function handleRespeak(
  chatId: number,
  account: LinkedAccount,
  draft: NonNullable<DraftWithItems>,
  text: string,
  intent: ExtractedIntent | null,
) {
  const itemId = draft.respeakItemId!;
  await clearRespeak(draft.id);

  if (itemId === PENDING_CUSTOMER) {
    await handleRespeakCustomer(chatId, account, text, intent);
    return;
  }
  if (itemId === PENDING_ADD_ITEMS) {
    await handleAddItems(chatId, account, intent);
    return;
  }
  if (itemId === PENDING_PAYMENT) {
    await handleRespeakPayment(chatId, account, draft, text, intent);
    return;
  }

  await handleItemEdit(chatId, account, draft, itemId, text, intent);
}

async function handleCallbackQuery(
  callback: NonNullable<TelegramUpdate["callback_query"]>,
) {
  const chatId = callback.message?.chat.id;
  const data = callback.data;
  if (!chatId || !data) {
    await answerCallbackQuery({ callbackQueryId: callback.id });
    return;
  }

  const account = await resolveLinkedAccount(BigInt(callback.from.id));
  if (!account) {
    await answerCallbackQuery({
      callbackQueryId: callback.id,
      text: botText.callbackUnauthorized,
      showAlert: true,
    });
    return;
  }

  const [action, ...rest] = data.split(":");

  const t = botText;

  if (action === "confirm" || action === "cancel") {
    const token = rest.join(":");
    const draft = await getDraftByToken(token);
    if (!draft || draft.telegramAccountId !== account.id) {
      await answerCallbackQuery({
        callbackQueryId: callback.id,
        text: t.callbackNotFound,
      });
      return;
    }
    await answerCallbackQuery({ callbackQueryId: callback.id });
    if (action === "confirm") {
      await confirmActiveDraft(chatId, draft.id, account.adminId);
    } else {
      await cancelDraft(draft.id);
      await sendMessage({ chatId, text: t.draftCancelled });
    }
    return;
  }

  if (action === "pick" || action === "respeak") {
    const [itemId, productId] = rest;
    const active = await getActiveDraftForAccount(account.id);
    // The item must belong to THIS account's active draft.
    const item = active?.items.find((i) => i.id === itemId);
    if (!active || !item || (action === "pick" && !productId)) {
      await answerCallbackQuery({
        callbackQueryId: callback.id,
        text: t.callbackNotFound,
      });
      return;
    }
    await answerCallbackQuery({ callbackQueryId: callback.id });
    if (action === "pick") {
      await pickCandidateForItem(item.id, productId);
      await replyDraft(chatId, await getActiveDraftForAccount(account.id), t);
    } else {
      await startRespeak(active.id, item.id);
      await sendMessage({ chatId, text: t.respeakPrompt });
    }
    return;
  }

  if (action === "edititems") {
    const active = await getActiveDraftForAccount(account.id);
    if (!active) {
      await answerCallbackQuery({
        callbackQueryId: callback.id,
        text: t.callbackNotFound,
      });
      return;
    }
    await answerCallbackQuery({ callbackQueryId: callback.id });
    await sendItemCards(chatId, active, t);
    return;
  }

  if (action === "itemedit" || action === "itemdel") {
    const active = await getActiveDraftForAccount(account.id);
    // The item must belong to THIS account's active draft.
    const item = active?.items.find((i) => i.id === rest[0]);
    if (!active || !item) {
      await answerCallbackQuery({
        callbackQueryId: callback.id,
        text: t.callbackNotFound,
      });
      return;
    }
    await answerCallbackQuery({ callbackQueryId: callback.id });
    if (action === "itemdel") {
      await deleteDraftItem(item.id);
      await sendMessage({ chatId, text: t.itemDeleted });
      await replyDraft(chatId, await getActiveDraftForAccount(account.id), t);
    } else {
      await startRespeak(active.id, item.id);
      await sendMessage({ chatId, text: t.itemEditPrompt });
    }
    return;
  }

  if (action === "additems") {
    const active = await getActiveDraftForAccount(account.id);
    if (!active) {
      await answerCallbackQuery({
        callbackQueryId: callback.id,
        text: t.callbackNotFound,
      });
      return;
    }
    await answerCallbackQuery({ callbackQueryId: callback.id });
    await startRespeak(active.id, PENDING_ADD_ITEMS);
    await sendMessage({ chatId, text: t.addItemsPrompt });
    return;
  }

  if (action === "editcust" || action === "editpay") {
    const active = await getActiveDraftForAccount(account.id);
    if (!active) {
      await answerCallbackQuery({
        callbackQueryId: callback.id,
        text: t.callbackNotFound,
      });
      return;
    }
    await answerCallbackQuery({ callbackQueryId: callback.id });
    if (action === "editcust") {
      await startRespeak(active.id, PENDING_CUSTOMER);
      await sendMessage({ chatId, text: t.respeakCustomerPrompt });
    } else {
      await sendMessage({
        chatId,
        text: t.paymentMenuPrompt,
        replyMarkup: {
          inline_keyboard: [
            [
              { text: t.payFullButton, callback_data: "pay:full" },
              { text: t.payNoneButton, callback_data: "pay:none" },
            ],
            [{ text: t.payPartialButton, callback_data: "pay:partial" }],
            (["CASH", "BANK_TRANSFER", "CREDIT_CARD"] as const).map((m) => ({
              text: ar.statusLabels.paymentMethod[m],
              callback_data: `paym:${m}`,
            })),
          ],
        },
      });
    }
    return;
  }

  if (action === "pay" || action === "paym") {
    const active = await getActiveDraftForAccount(account.id);
    if (!active) {
      await answerCallbackQuery({
        callbackQueryId: callback.id,
        text: t.callbackNotFound,
      });
      return;
    }
    await answerCallbackQuery({ callbackQueryId: callback.id });
    const value = rest[0];
    if (action === "pay" && value === "partial") {
      await startRespeak(active.id, PENDING_PAYMENT);
      await sendMessage({ chatId, text: t.respeakPaymentPrompt });
      return;
    }
    const input: PaymentInput =
      action === "pay"
        ? {
            status: value === "full" ? "PAID" : "UNPAID",
            amount: null,
            method: null,
          }
        : {
            status: null,
            amount: null,
            method: (["CASH", "BANK_TRANSFER", "CREDIT_CARD"].includes(value)
              ? value
              : null) as PaymentMethod | null,
          };
    const patch = buildPaymentPatch(input, {
      paymentMethod: active.paymentMethod,
    });
    if (patch) {
      await prisma.telegramInvoiceDraft.update({
        where: { id: active.id },
        data: patch,
      });
    }
    await replyDraft(chatId, await getActiveDraftForAccount(account.id), t);
    return;
  }

  if (action === "setcust") {
    const customerId = rest[0];
    if (!customerId) {
      await answerCallbackQuery({ callbackQueryId: callback.id });
      return;
    }
    const active = await getActiveDraftForAccount(account.id);
    const customer = active
      ? await prisma.customer.findUnique({
          where: { id: customerId },
          select: { id: true, name: true },
        })
      : null;
    if (!active || !customer) {
      await answerCallbackQuery({
        callbackQueryId: callback.id,
        text: t.callbackNotFound,
      });
      return;
    }
    await setDraftCustomer(active.id, customer.id);
    await answerCallbackQuery({ callbackQueryId: callback.id });
    await sendMessage({
      chatId,
      text: `${t.customerSetPrefix} ${escapeTelegramHtml(customer.name)}`,
    });
    const refreshed = await getDraftByToken(active.token);
    await replyDraft(chatId, refreshed, t);
    return;
  }

  await answerCallbackQuery({ callbackQueryId: callback.id });
}

const seenUpdateIds = new Set<number>();
function alreadyHandled(updateId: number): boolean {
  if (seenUpdateIds.has(updateId)) return true;
  seenUpdateIds.add(updateId);
  if (seenUpdateIds.size > 500) {
    seenUpdateIds.delete(seenUpdateIds.values().next().value as number);
  }
  return false;
}

export async function POST(request: NextRequest) {
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!expectedSecret) {
    return NextResponse.json({ error: "not configured" }, { status: 503 });
  }
  const providedSecret = request.headers.get("x-telegram-bot-api-secret-token");
  if (providedSecret !== expectedSecret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let update: TelegramUpdate;
  try {
    update = await request.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  if (
    typeof update.update_id === "number" &&
    alreadyHandled(update.update_id)
  ) {
    return NextResponse.json({ ok: true });
  }

  try {
    if (update.message) await handleMessage(update.message);
    else if (update.callback_query)
      await handleCallbackQuery(update.callback_query);
  } catch (error) {
    console.error("[telegram/webhook] update handling failed", error);
  }

  return NextResponse.json({ ok: true });
}
