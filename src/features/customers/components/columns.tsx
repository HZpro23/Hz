"use client";

import Link from "next/link";
import { Pencil } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog";
import { deleteCustomer } from "@/features/customers/actions";

export type CustomerRow = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  _count: { orders: number };
};

export function getCustomerColumns(
  editHref: (id: string) => string,
): ColumnDef<CustomerRow>[] {
  return [
    { accessorKey: "name", header: "الاسم" },
    {
      accessorKey: "phone",
      header: "الهاتف / واتساب",
      cell: ({ row }) => <span dir="ltr">{row.original.phone}</span>,
    },
    {
      accessorKey: "email",
      header: "البريد الإلكتروني",
      cell: ({ row }) => (
        <span dir="ltr">{row.original.email ?? "—"}</span>
      ),
    },
    {
      id: "ordersCount",
      header: "عدد الطلبات",
      cell: ({ row }) => row.original._count.orders.toLocaleString("ar"),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            nativeButton={false} render={<Link href={editHref(row.original.id)} />}
          >
            <Pencil className="size-4" />
          </Button>
          <ConfirmDeleteDialog
            action={() => deleteCustomer(row.original.id)}
            description={`سيتم حذف العميل "${row.original.name}" نهائياً.`}
          />
        </div>
      ),
    },
  ];
}
