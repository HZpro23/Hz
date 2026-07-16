import type { PaymentStatus } from "@/generated/prisma/client";

const EPSILON = 0.01;

export function computePaymentStatus(
  total: number,
  paidAmount: number,
): PaymentStatus {
  if (paidAmount <= EPSILON) return "UNPAID";
  if (paidAmount >= total - EPSILON) return "PAID";
  return "PARTIALLY_PAID";
}
