"use client";

import Link from "next/link";
import { Eye } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PURCHASE_ORDER_STATUS_LABELS } from "@/features/purchases/schema";

export type PurchaseOrderRow = {
  id: string;
  orderNumber: string;
  total: number;
  status: string;
  createdAt: Date;
  supplier: { name: string };
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive"> = {
  PENDING: "secondary",
  RECEIVED: "default",
  CANCELLED: "destructive",
};

export const purchaseOrderColumns: ColumnDef<PurchaseOrderRow>[] = [
  {
    accessorKey: "orderNumber",
    header: "رقم الأمر",
    cell: ({ row }) => <span dir="ltr">{row.original.orderNumber}</span>,
  },
  {
    id: "supplier",
    header: "المورد",
    cell: ({ row }) => row.original.supplier.name,
  },
  {
    id: "total",
    header: "الإجمالي",
    cell: ({ row }) => String(row.original.total),
  },
  {
    id: "status",
    header: "الحالة",
    cell: ({ row }) => (
      <Badge variant={STATUS_VARIANT[row.original.status] ?? "secondary"}>
        {PURCHASE_ORDER_STATUS_LABELS[row.original.status] ?? row.original.status}
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
      <Button
        variant="ghost"
        size="icon-sm"
        nativeButton={false} render={<Link href={`/dashboard/purchases/${row.original.id}`} />}
      >
        <Eye className="size-4" />
      </Button>
    ),
  },
];
