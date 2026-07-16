"use client";

import Link from "next/link";
import { Eye } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog";
import { deletePurchaseOrder } from "@/features/purchases/actions";
import { PURCHASE_ORDER_STATUS_LABELS } from "@/features/purchases/schema";
import { formatCurrency } from "@/lib/currency";

export type PurchaseOrderRow = {
  id: string;
  orderNumber: string;
  total: number;
  status: string;
  createdAt: Date;
  supplier: { name: string };
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive"> =
  {
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
    cell: ({ row }) => formatCurrency(row.original.total),
  },
  {
    id: "status",
    header: "الحالة",
    cell: ({ row }) => (
      <Badge variant={STATUS_VARIANT[row.original.status] ?? "secondary"}>
        {PURCHASE_ORDER_STATUS_LABELS[row.original.status] ??
          row.original.status}
      </Badge>
    ),
  },
  {
    id: "createdAt",
    header: "التاريخ",
    cell: ({ row }) =>
      new Date(row.original.createdAt).toLocaleDateString("fr-FR"),
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
          render={<Link href={`/dashboard/purchases/${row.original.id}`} />}
        >
          <Eye className="size-4" />
        </Button>
        <ConfirmDeleteDialog
          action={() => deletePurchaseOrder(row.original.id)}
          description={`سيتم حذف أمر الشراء "${row.original.orderNumber}" نهائياً.`}
        />
      </div>
    ),
  },
];
