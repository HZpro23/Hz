"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { DataTable } from "@/components/data-table/data-table";
import {
  getCustomerColumns,
  type CustomerRow,
} from "@/features/customers/components/columns";
import { deleteCustomers } from "@/features/customers/actions";

export function CustomersTable({ data }: { data: CustomerRow[] }) {
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
      columns={getCustomerColumns(editHref)}
      data={data}
      onDeleteSelected={deleteCustomers}
    />
  );
}
