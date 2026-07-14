"use client";

import Link from "next/link";
import { Pencil } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog";
import { deleteExpense } from "@/features/expenses/actions";
import { EXPENSE_CATEGORY_LABELS } from "@/features/expenses/schema";

export type ExpenseRow = {
  id: string;
  category: string;
  amount: number;
  description: string | null;
  date: Date;
};

export function getExpenseColumns(
  editHref: (id: string) => string,
): ColumnDef<ExpenseRow>[] {
  return [
    {
      id: "category",
      header: "الفئة",
      cell: ({ row }) => (
        <Badge variant="secondary">
          {EXPENSE_CATEGORY_LABELS[row.original.category] ??
            row.original.category}
        </Badge>
      ),
    },
    {
      id: "amount",
      header: "المبلغ",
      cell: ({ row }) => String(row.original.amount),
    },
    {
      id: "description",
      header: "الوصف",
      cell: ({ row }) => row.original.description ?? "—",
    },
    {
      id: "date",
      header: "التاريخ",
      cell: ({ row }) =>
        new Date(row.original.date).toLocaleDateString("fr-FR"),
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
            render={<Link href={editHref(row.original.id)} />}
          >
            <Pencil className="size-4" />
          </Button>
          <ConfirmDeleteDialog
            action={() => deleteExpense(row.original.id)}
            description="سيتم حذف هذا المصروف نهائياً."
          />
        </div>
      ),
    },
  ];
}
