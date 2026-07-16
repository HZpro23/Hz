import { z } from "zod";
import { ar, invertLabels } from "@/i18n/ar";

export const PAYMENT_METHOD_LABELS: Record<string, string> =
  ar.statusLabels.paymentMethod;
export const PAYMENT_METHOD_VALUE_BY_LABEL = invertLabels(
  PAYMENT_METHOD_LABELS,
);

export const PAYMENT_STATUS_LABELS: Record<string, string> =
  ar.statusLabels.paymentStatus;
export const PAYMENT_STATUS_VALUE_BY_LABEL = invertLabels(
  PAYMENT_STATUS_LABELS,
);

export const invoiceItemSchema = z.object({
  productId: z.string().optional(),
  name: z.string().min(1, { error: "اسم المنتج مطلوب" }),
  quantity: z.coerce
    .number()
    .int()
    .min(1, { error: "الكمية يجب أن تكون رقماً موجباً" }),
  unitPrice: z.coerce
    .number()
    .min(0, { error: "السعر يجب أن يكون رقماً موجباً" }),
});

export const invoiceSchema = z
  .object({
    language: z.enum(["AR", "FR"]),
    customerId: z.string().min(1, { error: "الرجاء اختيار عميل" }),
    customerName: z
      .string()
      .min(2, { error: "الاسم يجب أن يتكون من حرفين على الأقل" }),
    customerPhone: z.string().min(6, { error: "رقم الهاتف غير صحيح" }),
    customerEmail: z
      .union([z.email({ error: "البريد الإلكتروني غير صحيح" }), z.literal("")])
      .optional(),
    notes: z.string().optional(),
    orderId: z.string().optional(),
    items: z
      .array(invoiceItemSchema)
      .min(1, { error: "أضف منتجاً واحداً على الأقل" }),
    paymentMethod: z.enum(["CASH", "BANK_TRANSFER", "CREDIT_CARD", "OTHER"]),
    paymentStatus: z.enum(["UNPAID", "PARTIALLY_PAID", "PAID"]),
    paidAmount: z.coerce.number().min(0).default(0),
  })
  .refine(
    (data) => {
      if (data.paymentStatus !== "PARTIALLY_PAID") return true;
      const total = data.items.reduce(
        (sum, item) => sum + item.quantity * item.unitPrice,
        0,
      );
      return data.paidAmount > 0 && data.paidAmount < total;
    },
    {
      error: "المبلغ المدفوع يجب أن يكون أكبر من صفر وأقل من إجمالي الفاتورة",
      path: ["paidAmount"],
    },
  );

export type InvoiceInput = z.input<typeof invoiceSchema>;
export type InvoiceOutput = z.output<typeof invoiceSchema>;

export const INVOICE_LANGUAGE_LABELS: Record<string, string> = {
  AR: "العربية",
  FR: "Français",
};
