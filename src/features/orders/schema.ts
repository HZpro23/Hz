import { z } from "zod";
import { ar, invertLabels } from "@/i18n/ar";

export const ORDER_STATUS_LABELS: Record<string, string> =
  ar.statusLabels.order;
export const ORDER_STATUS_VALUE_BY_LABEL = invertLabels(ORDER_STATUS_LABELS);

export const ORDER_INVOICE_FILTER_LABELS: Record<string, string> = {
  NO_INVOICE: "بدون فاتورة",
  HAS_INVOICE: "لديها فاتورة",
};
export const ORDER_INVOICE_FILTER_VALUE_BY_LABEL = invertLabels(
  ORDER_INVOICE_FILTER_LABELS,
);

export const orderItemsSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().optional(),
        productId: z.string().min(1, { error: "الرجاء اختيار منتج" }),
        price: z.coerce
          .number()
          .min(0, { error: "السعر يجب أن يكون رقماً موجباً" }),
        quantity: z.coerce
          .number()
          .int()
          .min(1, { error: "الكمية يجب أن تكون رقماً موجباً" }),
      }),
    )
    .min(1),
});

export type OrderItemsInput = z.input<typeof orderItemsSchema>;
export type OrderItemsOutput = z.output<typeof orderItemsSchema>;

export const reassignOrderCustomerSchema = z.object({
  customerId: z.string().min(1, { error: "الرجاء اختيار عميل" }),
});

export const createOrderSchema = z.object({
  customerId: z.string().min(1, { error: "الرجاء اختيار عميل" }),
  notes: z.string().optional(),
  items: z
    .array(
      z.object({
        productId: z.string().min(1, { error: "الرجاء اختيار منتج" }),
        quantity: z.coerce
          .number()
          .int()
          .min(1, { error: "الكمية يجب أن تكون رقماً موجباً" }),
        price: z.coerce
          .number()
          .min(0, { error: "السعر يجب أن يكون رقماً موجباً" }),
      }),
    )
    .min(1, { error: "أضف منتجاً واحداً على الأقل" }),
});

export type CreateOrderInput = z.input<typeof createOrderSchema>;
export type CreateOrderOutput = z.output<typeof createOrderSchema>;
