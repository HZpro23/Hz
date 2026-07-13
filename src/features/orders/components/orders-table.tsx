"use client";

import { DataTable } from "@/components/data-table/data-table";
import { orderColumns, type OrderRow } from "@/features/orders/components/columns";

export function OrdersTable({ data }: { data: OrderRow[] }) {
  return <DataTable columns={orderColumns} data={data} />;
}
