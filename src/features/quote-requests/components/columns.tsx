"use client";

import Link from "next/link";
import { Eye } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QUOTE_STATUS_LABELS } from "@/features/quote-requests/schema";

export type QuoteRequestRow = {
  id: string;
  customerName: string;
  phone: string;
  quantity: number;
  status: string;
  createdAt: Date;
  product: { name: string } | null;
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive"> =
  {
    PENDING: "secondary",
    QUOTED: "default",
    SENT: "default",
    ACCEPTED: "default",
    REJECTED: "destructive",
  };

export const quoteRequestColumns: ColumnDef<QuoteRequestRow>[] = [
  { accessorKey: "customerName", header: "العميل" },
  {
    accessorKey: "phone",
    header: "الهاتف",
    cell: ({ row }) => <span dir="ltr">{row.original.phone}</span>,
  },
  {
    id: "product",
    header: "المنتج",
    cell: ({ row }) => row.original.product?.name ?? "غير محدد",
  },
  {
    id: "quantity",
    header: "الكمية",
    cell: ({ row }) => row.original.quantity.toLocaleString("ar"),
  },
  {
    id: "status",
    header: "الحالة",
    cell: ({ row }) => (
      <Badge variant={STATUS_VARIANT[row.original.status] ?? "secondary"}>
        {QUOTE_STATUS_LABELS[row.original.status] ?? row.original.status}
      </Badge>
    ),
  },
  {
    id: "createdAt",
    header: "التاريخ",
    cell: ({ row }) =>
      new Date(row.original.createdAt).toLocaleDateString("en-US"),
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => (
      <Button
        variant="ghost"
        size="icon-sm"
        nativeButton={false}
        render={<Link href={`/dashboard/quote-requests/${row.original.id}`} />}
      >
        <Eye className="size-4" />
      </Button>
    ),
  },
];
