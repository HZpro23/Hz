"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Pencil, UserCircle, Star } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { PasswordConfirmDeleteDialog } from "@/components/shared/password-confirm-delete-dialog";
import { deleteCustomer, toggleCustomerFavorite } from "@/features/customers/actions";
import { formatCurrency } from "@/lib/currency";
import { cn } from "@/lib/utils";
import { ar } from "@/i18n/ar";

export type CustomerRow = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  isFavorite: boolean;
  _count: { orders: number };
  totalPurchased: number;
  totalPaid: number;
  outstanding: number;
  balance: number;
};

function FavoriteToggle({
  id,
  isFavorite,
}: {
  id: string;
  isFavorite: boolean;
}) {
  const [optimistic, setOptimistic] = useState(isFavorite);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    const next = !optimistic;
    setOptimistic(next);
    startTransition(async () => {
      const result = await toggleCustomerFavorite(id, next);
      if (result?.error) {
        setOptimistic(!next);
        toast.error(result.error);
      }
    });
  }

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      className="cursor-pointer"
      disabled={isPending}
      onClick={handleClick}
      title={optimistic ? "إزالة من المفضلة" : "إضافة إلى المفضلة"}
    >
      <Star
        className={cn(
          "size-4",
          optimistic && "fill-amber-400 text-amber-400",
        )}
      />
    </Button>
  );
}

export function getCustomerColumns(
  editHref: (id: string) => string,
): ColumnDef<CustomerRow>[] {
  return [
    {
      id: "favorite",
      header: "",
      cell: ({ row }) => (
        <FavoriteToggle
          id={row.original.id}
          isFavorite={row.original.isFavorite}
        />
      ),
    },
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
      id: "totalPurchased",
      header: ar.customers.totalPurchased,
      cell: ({ row }) => formatCurrency(row.original.totalPurchased),
    },
    {
      id: "totalPaid",
      header: ar.customers.totalPaid,
      cell: ({ row }) => formatCurrency(row.original.totalPaid),
    },
    {
      id: "outstanding",
      header: ar.customers.outstandingAmount,
      cell: ({ row }) => {
        const outstanding = row.original.outstanding;
        return (
          <span className={outstanding > 0 ? "font-medium text-amber-600 dark:text-amber-400" : undefined}>
            {formatCurrency(outstanding)}
          </span>
        );
      },
    },
    {
      id: "balance",
      header: ar.customers.balance,
      cell: ({ row }) => {
        const balance = row.original.balance;
        return (
          <span
            className={
              balance < 0
                ? "text-destructive font-medium"
                : balance > 0
                  ? "text-emerald-600 font-medium dark:text-emerald-400"
                  : undefined
            }
          >
            {formatCurrency(balance)}
          </span>
        );
      },
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
            render={<Link href={`/dashboard/customers/${row.original.id}`} />}
            title={ar.customers.viewProfile}
          >
            <UserCircle className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            nativeButton={false} render={<Link href={editHref(row.original.id)} />}
          >
            <Pencil className="size-4" />
          </Button>
          <PasswordConfirmDeleteDialog
            action={(password) => deleteCustomer(row.original.id, password)}
            description={`سيتم حذف العميل "${row.original.name}" نهائياً.`}
          />
        </div>
      ),
    },
  ];
}
