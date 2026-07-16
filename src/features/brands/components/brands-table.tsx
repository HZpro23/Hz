"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { DataTable } from "@/components/data-table/data-table";
import {
  getBrandColumns,
  type BrandRow,
} from "@/features/brands/components/columns";
import { deleteBrands } from "@/features/brands/actions";

export function BrandsTable({ data }: { data: BrandRow[] }) {
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
      columns={getBrandColumns(editHref)}
      data={data}
      onDeleteSelected={deleteBrands}
    />
  );
}
