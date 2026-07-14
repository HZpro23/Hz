"use client";

import { DataTable } from "@/components/data-table/data-table";
import {
  invoiceColumns,
  type InvoiceRow,
} from "@/features/invoices/components/columns";

export function InvoicesTable({ data }: { data: InvoiceRow[] }) {
  return <DataTable columns={invoiceColumns} data={data} />;
}
