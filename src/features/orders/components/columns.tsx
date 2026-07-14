"use client";

import Link from "next/link";
import { Eye } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ORDER_STATUS_LABELS } from "@/features/orders/schema";

export type OrderRow = {
  id: string;
  orderNumber: string;
  total: number;
  status: string;
  createdAt: Date;
  customer: { name: string; phone: string };
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive"> =
  {
    PENDING: "secondary",
    PROCESSING: "default",
    COMPLETED: "default",
    CANCELLED: "destructive",
  };

export const orderColumns: ColumnDef<OrderRow>[] = [
  {
    accessorKey: "orderNumber",
    header: "رقم الطلب",
    cell: ({ row }) => <span dir="ltr">{row.original.orderNumber}</span>,
  },
  {
    id: "customer",
    header: "العميل",
    cell: ({ row }) => row.original.customer.name,
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
        {ORDER_STATUS_LABELS[row.original.status] ?? row.original.status}
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
      <Button
        variant="ghost"
        size="icon-sm"
        nativeButton={false}
        render={<Link href={`/dashboard/orders/${row.original.id}`} />}
      >
        <Eye className="size-4" />
      </Button>
    ),
  },
];
