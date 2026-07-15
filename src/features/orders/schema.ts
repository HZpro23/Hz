import { z } from "zod";
import { ar, invertLabels } from "@/i18n/ar";

export const ORDER_STATUS_LABELS: Record<string, string> =
  ar.statusLabels.order;
export const ORDER_STATUS_VALUE_BY_LABEL = invertLabels(ORDER_STATUS_LABELS);

export const orderItemPricesSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string(),
        price: z.coerce
          .number()
          .min(0, { error: "السعر يجب أن يكون رقماً موجباً" }),
      }),
    )
    .min(1),
});

export type OrderItemPricesInput = z.input<typeof orderItemPricesSchema>;
export type OrderItemPricesOutput = z.output<typeof orderItemPricesSchema>;
