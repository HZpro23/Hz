"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { DataTable } from "@/components/data-table/data-table";
import {
  getCategoryColumns,
  type CategoryRow,
} from "@/features/categories/components/columns";
import { deleteCategories } from "@/features/categories/actions";

export function CategoriesTable({ data }: { data: CategoryRow[] }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function editHref(id: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("new");
    params.set("edit", id);
    return `${pathname}?${params.toString()}`;
  }

  return (
    <DataTable
      columns={getCategoryColumns(editHref)}
      data={data}
      onDeleteSelected={deleteCategories}
    />
  );
}
