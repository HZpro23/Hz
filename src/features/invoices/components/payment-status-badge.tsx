import { Badge } from "@/components/ui/badge";
import { ar } from "@/i18n/ar";
import type { PaymentStatus } from "@/generated/prisma/client";

const VARIANT_BY_STATUS: Record<
  PaymentStatus,
  "default" | "secondary" | "destructive"
> = {
  PAID: "default",
  PARTIALLY_PAID: "secondary",
  UNPAID: "destructive",
};

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return (
    <Badge variant={VARIANT_BY_STATUS[status]}>
      {ar.statusLabels.paymentStatus[status]}
    </Badge>
  );
}
