import Link from "next/link";
import { FileText } from "lucide-react";

export function InvoiceLockedNotice({
  invoiceId,
  invoiceNumber,
  message,
}: {
  invoiceId: string;
  invoiceNumber: string;
  message: string;
}) {
  return (
    <div className="space-y-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
      <p className="text-amber-800 dark:text-amber-400">{message}</p>
      <Link
        href={`/dashboard/invoices/${invoiceId}`}
        className="inline-flex items-center gap-1.5 font-medium text-primary underline underline-offset-2"
      >
        <FileText className="size-4" />
        عرض الفاتورة رقم <span dir="ltr">{invoiceNumber}</span>
      </Link>
    </div>
  );
}
