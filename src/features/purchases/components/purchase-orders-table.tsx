"use client";

import { DataTable } from "@/components/data-table/data-table";
import {
  purchaseOrderColumns,
  type PurchaseOrderRow,
} from "@/features/purchases/components/columns";

export function PurchaseOrdersTable({ data }: { data: PurchaseOrderRow[] }) {
  return <DataTable columns={purchaseOrderColumns} data={data} />;
}
