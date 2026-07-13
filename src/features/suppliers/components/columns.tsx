"use client";

import Link from "next/link";
import { Pencil } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog";
import { deleteSupplier } from "@/features/suppliers/actions";

export type SupplierRow = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  _count: { purchaseOrders: number };
};

export function getSupplierColumns(
  editHref: (id: string) => string,
): ColumnDef<SupplierRow>[] {
  return [
    { accessorKey: "name", header: "الاسم" },
    {
      accessorKey: "phone",
      header: "الهاتف",
      cell: ({ row }) => <span dir="ltr">{row.original.phone ?? "—"}</span>,
    },
    {
      accessorKey: "email",
      header: "البريد الإلكتروني",
      cell: ({ row }) => <span dir="ltr">{row.original.email ?? "—"}</span>,
    },
    {
      id: "purchaseOrdersCount",
      header: "أوامر الشراء",
      cell: ({ row }) =>
        row.original._count.purchaseOrders.toLocaleString("ar"),
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
            action={() => deleteSupplier(row.original.id)}
            description={`سيتم حذف المورد "${row.original.name}" نهائياً.`}
          />
        </div>
      ),
    },
  ];
}
