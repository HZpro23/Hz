"use client";

import { DataTable } from "@/components/data-table/data-table";
import {
  quoteRequestColumns,
  type QuoteRequestRow,
} from "@/features/quote-requests/components/columns";

export function QuoteRequestsTable({ data }: { data: QuoteRequestRow[] }) {
  return <DataTable columns={quoteRequestColumns} data={data} />;
}
