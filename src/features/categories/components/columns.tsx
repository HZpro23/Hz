"use client";

import Link from "next/link";
import { Pencil } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog";
import { deleteCategory } from "@/features/categories/actions";

export type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  parent: { name: string } | null;
  _count: { products: number; children: number };
};

export function getCategoryColumns(
  editHref: (id: string) => string,
): ColumnDef<CategoryRow>[] {
  return [
    { accessorKey: "name", header: "الاسم" },
    {
      accessorKey: "slug",
      header: "الرابط",
      cell: ({ row }) => (
        <span dir="ltr" className="text-muted-foreground">
          {row.original.slug}
        </span>
      ),
    },
    {
      id: "parent",
      header: "القسم الأب",
      cell: ({ row }) => row.original.parent?.name ?? "—",
    },
    {
      id: "productsCount",
      header: "عدد المنتجات",
      cell: ({ row }) => row.original._count.products.toLocaleString("ar"),
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
            action={() => deleteCategory(row.original.id)}
            description={`سيتم حذف القسم "${row.original.name}" نهائياً.`}
          />
        </div>
      ),
    },
  ];
}
