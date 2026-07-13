import Link from "next/link";
import { Plus, Receipt } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { getExpensesPage, getExpenseById } from "@/features/expenses/queries";
import { ExpensesTable } from "@/features/expenses/components/expenses-table";
import { ExpenseFormSheet } from "@/features/expenses/components/expense-form-sheet";
import { ar } from "@/i18n/ar";
import type { ExpenseCategory } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    category?: string;
    new?: string;
    edit?: string;
  }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const category = params.category as ExpenseCategory | undefined;

  const [{ items, total, pageSize, totalAmount }, editingExpense] =
    await Promise.all([
      getExpensesPage({ category, page }),
      params.edit ? getExpenseById(params.edit) : Promise.resolve(null),
    ]);

  const isSheetOpen = params.new === "1" || Boolean(params.edit);

  function buildHref(extra: Record<string, string>) {
    const sp = new URLSearchParams();
    if (page > 1) sp.set("page", String(page));
    for (const [key, value] of Object.entries(extra)) sp.set(key, value);
    return `/dashboard/expenses?${sp.toString()}`;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={ar.admin.expenses}
        description={`إجمالي المصروفات: ${String(totalAmount)}`}
        action={
          <Button nativeButton={false} render={<Link href={buildHref({ new: "1" })} />}>
            <Plus className="size-4" />
            إضافة مصروف
          </Button>
        }
      />
      {items.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="لا توجد مصروفات مسجلة"
          description="ابدأ بتسجيل أول مصروف"
        />
      ) : (
        <>
          <ExpensesTable
            data={items.map((item) => ({
              ...item,
              amount: Number(item.amount),
            }))}
          />
          <DataTablePagination
            page={page}
            pageSize={pageSize}
            total={total}
            basePath="/dashboard/expenses"
            searchParams={{}}
          />
        </>
      )}
      <ExpenseFormSheet
        key={editingExpense?.id ?? (params.new ? "new" : "closed")}
        open={isSheetOpen}
        expense={
          editingExpense
            ? { ...editingExpense, amount: Number(editingExpense.amount) }
            : null
        }
      />
    </div>
  );
}
