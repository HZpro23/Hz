import { z } from "zod";
import { ar, invertLabels } from "@/i18n/ar";

export const PRODUCT_STATUS_LABELS: Record<string, string> =
  ar.statusLabels.productStatus;
export const PRODUCT_STATUS_VALUE_BY_LABEL = invertLabels(
  PRODUCT_STATUS_LABELS,
);

export const productImageSchema = z.object({
  publicId: z.string(),
  secureUrl: z.string(),
});

export const productSchema = z.object({
  name: z.string().min(2, { error: "الاسم يجب أن يتكون من حرفين على الأقل" }),
  slug: z
    .string()
    .min(2, { error: "الرابط يجب أن يتكون من حرفين على الأقل" })
    .regex(/^[a-z0-9-]+$/, {
      error: "الرابط يجب أن يحتوي على أحرف إنجليزية صغيرة وأرقام وشرطات فقط",
    }),
  sku: z.string().min(1, { error: "SKU مطلوب" }),
  barcode: z.string().optional(),
  description: z.string().optional(),
  categoryId: z.string().min(1, { error: "الرجاء اختيار القسم" }),
  brandId: z.string().nullable().optional(),
  quantity: z.coerce
    .number()
    .int()
    .min(0, { error: "الكمية يجب أن تكون رقماً موجباً" }),
  minStockLevel: z.coerce
    .number()
    .int()
    .min(0, { error: "الحد الأدنى يجب أن يكون رقماً موجباً" }),
  status: z.enum(["ACTIVE", "INACTIVE"]),
  images: z.array(productImageSchema).default([]),
});

export type ProductInput = z.input<typeof productSchema>;
export type ProductOutput = z.output<typeof productSchema>;
