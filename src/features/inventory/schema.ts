import { z } from "zod";
import { ar, invertLabels } from "@/i18n/ar";

export const inventoryMovementSchema = z.object({
  productId: z.string().min(1, { error: "الرجاء اختيار المنتج" }),
  type: z.enum(["IN", "OUT", "ADJUSTMENT"]),
  quantity: z.coerce
    .number()
    .int()
    .min(0, { error: "الكمية يجب أن تكون رقماً موجباً" }),
  reason: z.string().optional(),
});

export type InventoryMovementInput = z.input<typeof inventoryMovementSchema>;
export type InventoryMovementOutput = z.output<
  typeof inventoryMovementSchema
>;

export const MOVEMENT_TYPE_LABELS: Record<string, string> =
  ar.statusLabels.movementType;
export const MOVEMENT_TYPE_VALUE_BY_LABEL = invertLabels(
  MOVEMENT_TYPE_LABELS,
);
