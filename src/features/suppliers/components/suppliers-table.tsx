"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { DataTable } from "@/components/data-table/data-table";
import {
  getSupplierColumns,
  type SupplierRow,
} from "@/features/suppliers/components/columns";
import { deleteSuppliers } from "@/features/suppliers/actions";

export function SuppliersTable({ data }: { data: SupplierRow[] }) {
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
      columns={getSupplierColumns(editHref)}
      data={data}
      onDeleteSelected={deleteSuppliers}
    />
  );
}
