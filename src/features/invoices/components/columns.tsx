"use client";

import Link from "next/link";
import { Eye } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog";
import { deleteInvoice } from "@/features/invoices/actions";
import { INVOICE_LANGUAGE_LABELS } from "@/features/invoices/schema";
import { formatCurrency } from "@/lib/currency";

export type InvoiceRow = {
  id: string;
  invoiceNumber: string;
  language: string;
  customerName: string;
  customerPhone: string;
  total: number;
  createdAt: Date;
  _count: { items: number };
};

export const invoiceColumns: ColumnDef<InvoiceRow>[] = [
  {
    accessorKey: "invoiceNumber",
    header: "رقم الفاتورة",
    cell: ({ row }) => <span dir="ltr">{row.original.invoiceNumber}</span>,
  },
  {
    accessorKey: "customerName",
    header: "العميل",
  },
  {
    id: "customerPhone",
    header: "الهاتف",
    cell: ({ row }) => <span dir="ltr">{row.original.customerPhone}</span>,
  },
  {
    id: "itemsCount",
    header: "عدد المنتجات",
    cell: ({ row }) => row.original._count.items.toLocaleString("ar"),
  },
  {
    id: "total",
    header: "الإجمالي",
    cell: ({ row }) => formatCurrency(row.original.total),
  },
  {
    id: "language",
    header: "اللغة",
    cell: ({ row }) => (
      <Badge variant="secondary">
        {INVOICE_LANGUAGE_LABELS[row.original.language] ??
          row.original.language}
      </Badge>
    ),
  },
  {
    id: "createdAt",
    header: "التاريخ",
    cell: ({ row }) =>
      new Date(row.original.createdAt).toLocaleDateString("ar-EG"),
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => (
      <div className="flex justify-end gap-1">
        <Button
          variant="ghost"
          size="icon-sm"
          nativeButton={false}
          render={<Link href={`/dashboard/invoices/${row.original.id}`} />}
        >
          <Eye className="size-4" />
        </Button>
        <ConfirmDeleteDialog
          action={() => deleteInvoice(row.original.id)}
          description={`سيتم حذف الفاتورة "${row.original.invoiceNumber}" نهائياً.`}
        />
      </div>
    ),
  },
];
