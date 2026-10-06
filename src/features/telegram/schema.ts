import { z } from "zod";

/**
 * Zod schemas for the Telegram AI Voice Invoice feature.
 *
 * `extractedIntentSchema` validates DeepSeek's intent-extraction output —
 * that output is UNTRUSTED, so numbers/strings are parsed leniently (mirrors
 * `src/features/purchases/scan-schema.ts`'s `looseNumber`/`looseString`) and
 * there is deliberately no field for productId/price/total/invoiceId: the AI
 * is never given a shape it could fill those in with.
 */

const looseNumber = z
  .preprocess((value) => {
    if (value == null || value === "") return null;
    if (typeof value === "number") return Number.isFinite(value) ? value : null;
    if (typeof value === "string") {
      const cleaned = value.trim().replace(/\s/g, "");
      const normalized = cleaned.includes(".")
        ? cleaned.replace(/,/g, "")
        : cleaned.replace(/,/g, ".");
      const n = Number(normalized);
      return Number.isFinite(n) ? n : null;
    }
    return null;
  }, z.number().nullable())
  .catch(null);

const looseString = z
  .preprocess((value) => {
    if (value == null) return null;
    if (typeof value === "string") return value.trim() || null;
    if (typeof value === "number" || typeof value === "boolean")
      return String(value);
    return null;
  }, z.string().nullable())
  .catch(null);

export const INTENT_ACTIONS = [
  "CREATE_INVOICE",
  "ADD_ITEM",
  "REMOVE_ITEM",
  "SET_QUANTITY",
  "SET_CUSTOMER",
  "SET_PAYMENT",
  "GET_TOTAL",
  "CONFIRM",
  "CANCEL",
  "WHO_ARE_YOU",
  "CHAT",
  "UNKNOWN",
] as const;
export type IntentAction = (typeof INTENT_ACTIONS)[number];

export const PAYMENT_STATUSES = ["PAID", "UNPAID", "PARTIAL"] as const;
export const BOT_PAYMENT_METHODS = [
  "CASH",
  "BANK_TRANSFER",
  "CREDIT_CARD",
  "OTHER",
] as const;

export const extractedIntentItemSchema = z.object({
  spokenName: looseString,
  spokenNameAlt: looseString,
  // Absolute quantity for CREATE_INVOICE/ADD_ITEM/SET_QUANTITY. Defaults to 1
  // when the speaker just names a product with no number ("زيد كابتشينو").
  quantity: looseNumber,
});
export type ExtractedIntentItem = z.infer<typeof extractedIntentItemSchema>;

export const extractedIntentSchema = z.object({
  action: z.enum(INTENT_ACTIONS).catch("UNKNOWN"),
  items: z.array(extractedIntentItemSchema).catch([]),
  customerQuery: looseString,
  // Same idea as spokenNameAlt, for customerQuery.
  customerQueryAlt: looseString,
  paymentStatus: z.enum(PAYMENT_STATUSES).nullable().catch(null),
  paymentAmount: looseNumber,
  paymentMethod: z.enum(BOT_PAYMENT_METHODS).nullable().catch(null),
  // Only meaningful for CHAT — a short, already-localized conversational
  // reply the model wrote itself (greetings, "how can you help me",
  // capability questions, small talk). Truncated defensively; sent to
  // Telegram as plain text (HTML-escaped first), never as an action to
  // execute.
  reply: looseString.transform((value) =>
    value ? value.slice(0, 600) : value,
  ),
});
export type ExtractedIntent = z.infer<typeof extractedIntentSchema>;

// ---------------------------------------------------------------------------
// Mini App action inputs — every one carries `token` (which draft) and
// `initData` (proof of who's calling), re-verified server-side on every call.
// ---------------------------------------------------------------------------

export const miniAppBaseSchema = z.object({
  token: z.string().min(1),
  initData: z.string().min(1),
});

export const miniAppSetQuantitySchema = miniAppBaseSchema.extend({
  itemId: z.string().min(1),
  quantity: z.coerce.number().int().min(1),
});

export const miniAppRemoveItemSchema = miniAppBaseSchema.extend({
  itemId: z.string().min(1),
});

export const miniAppAddItemSchema = miniAppBaseSchema.extend({
  productId: z.string().min(1),
  quantity: z.coerce.number().int().min(1).default(1),
});

export const miniAppSetCustomerSchema = miniAppBaseSchema.extend({
  customerId: z.string().min(1),
});

export const miniAppSetPaymentSchema = miniAppBaseSchema.extend({
  status: z.enum(PAYMENT_STATUSES),
  amount: z.coerce.number().min(0).optional(),
  method: z.enum(BOT_PAYMENT_METHODS).optional(),
});

export const miniAppPickCandidateSchema = miniAppBaseSchema.extend({
  itemId: z.string().min(1),
  productId: z.string().min(1),
});

export type MiniAppBaseInput = z.infer<typeof miniAppBaseSchema>;
