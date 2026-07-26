import { z } from "zod";
import { ar } from "@/i18n/ar";

export const purchaseOrderItemSchema = z.object({
  productId: z.string().min(1, { error: "الرجاء اختيار المنتج" }),
  quantity: z.coerce
    .number()
    .int()
    .min(1, { error: "الكمية يجب أن تكون رقماً موجباً" }),
  unitCost: z.coerce
    .number()
    .min(0, { error: "التكلفة يجب أن تكون رقماً موجباً" }),
});

export const purchaseOrderSchema = z.object({
  supplierId: z.string().min(1, { error: "الرجاء اختيار المورد" }),
  language: z.enum(["AR", "FR"]).default("AR"),
  items: z
    .array(purchaseOrderItemSchema)
    .min(1, { error: "أضف عنصراً واحداً على الأقل" }),
});

export type PurchaseOrderInput = z.input<typeof purchaseOrderSchema>;
export type PurchaseOrderOutput = z.output<typeof purchaseOrderSchema>;

export const purchaseOrderItemsSchema = z.object({
  items: z
    .array(purchaseOrderItemSchema)
    .min(1, { error: "أضف عنصراً واحداً على الأقل" }),
});

export type PurchaseOrderItemsInput = z.input<typeof purchaseOrderItemsSchema>;
export type PurchaseOrderItemsOutput = z.output<typeof purchaseOrderItemsSchema>;

export const PURCHASE_ORDER_STATUS_LABELS: Record<string, string> =
  ar.statusLabels.purchaseOrder;
