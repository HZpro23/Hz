import { ar, invertLabels } from "@/i18n/ar";

export const ORDER_STATUS_LABELS: Record<string, string> =
  ar.statusLabels.order;
export const ORDER_STATUS_VALUE_BY_LABEL = invertLabels(ORDER_STATUS_LABELS);
