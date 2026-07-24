import "server-only";
import { prisma } from "@/lib/prisma";
import { normalizeArabicName } from "@/lib/arabic-name";
import { Prisma } from "@/generated/prisma/client";

export const CUSTOMERS_PAGE_SIZE = 10;

export type DebtFilter = "HAS_DEBT" | "NO_DEBT";

export type CustomerSort =
  | "newest"
  | "totalPurchased_desc"
  | "totalPurchased_asc"
  | "outstanding_desc"
  | "outstanding_asc"
  | "balance_desc"
  | "balance_asc";

const CUSTOMER_SORT_CLAUSES: Record<CustomerSort, Prisma.Sql> = {
  newest: Prisma.sql`c."createdAt" DESC`,
  totalPurchased_desc: Prisma.sql`COALESCE(inv.total_purchased, 0) DESC`,
  totalPurchased_asc: Prisma.sql`COALESCE(inv.total_purchased, 0) ASC`,
  outstanding_desc: Prisma.sql`COALESCE(inv.outstanding, 0) DESC`,
  outstanding_asc: Prisma.sql`COALESCE(inv.outstanding, 0) ASC`,
  balance_desc: Prisma.sql`c.balance DESC`,
  balance_asc: Prisma.sql`c.balance ASC`,
};

export async function getCustomersPage({
  query,
  debtFilter,
  sort,
  page,
}: {
  query?: string;
  debtFilter?: DebtFilter;
  sort?: CustomerSort;
  page: number;
}) {
  const searchClause = query
    ? Prisma.sql`AND (c.name ILIKE ${"%" + query + "%"} OR c.phone ILIKE ${"%" + query + "%"} OR c.email ILIKE ${"%" + query + "%"})`
    : Prisma.empty;

  const debtClause =
    debtFilter === "HAS_DEBT"
      ? Prisma.sql`AND c.balance < 0`
      : debtFilter === "NO_DEBT"
        ? Prisma.sql`AND c.balance >= 0`
        : Prisma.empty;

  const orderByClause = CUSTOMER_SORT_CLAUSES[sort ?? "newest"];

  const rows = await prisma.$queryRaw<
    {
      id: string;
      name: string;
      phone: string;
      email: string | null;
      ordersCount: bigint;
      totalPurchased: string;
      totalPaid: string;
      outstanding: string;
      balance: string;
      totalCount: bigint;
    }[]
  >`
    SELECT
      c.id, c.name, c.phone, c.email,
      COALESCE(ord.orders_count, 0)::bigint AS "ordersCount",
      COALESCE(inv.total_purchased, 0)::numeric AS "totalPurchased",
      COALESCE(inv.total_paid, 0)::numeric AS "totalPaid",
      COALESCE(inv.outstanding, 0)::numeric AS "outstanding",
      c.balance::numeric AS "balance",
      COUNT(*) OVER()::bigint AS "totalCount"
    FROM "Customer" c
    LEFT JOIN (
      SELECT
        "customerId",
        SUM(total) AS total_purchased,
        SUM("paidAmount") AS total_paid,
        SUM(CASE WHEN "paymentStatus" IN ('UNPAID', 'PARTIALLY_PAID') THEN total - "paidAmount" ELSE 0 END) AS outstanding
      FROM "Invoice"
      WHERE "customerId" IS NOT NULL
      GROUP BY "customerId"
    ) inv ON inv."customerId" = c.id
    LEFT JOIN (
      SELECT "customerId", COUNT(*) AS orders_count
      FROM "Order"
      WHERE "customerId" IS NOT NULL
      GROUP BY "customerId"
    ) ord ON ord."customerId" = c.id
    WHERE 1=1 ${searchClause} ${debtClause}
    ORDER BY ${orderByClause}, c."createdAt" DESC
    LIMIT ${CUSTOMERS_PAGE_SIZE} OFFSET ${(page - 1) * CUSTOMERS_PAGE_SIZE}
  `;

  const total = rows.length > 0 ? Number(rows[0].totalCount) : 0;

  return {
    items: rows.map((row) => ({
      id: row.id,
      name: row.name,
      phone: row.phone,
      email: row.email,
      _count: { orders: Number(row.ordersCount) },
      totalPurchased: Number(row.totalPurchased),
      totalPaid: Number(row.totalPaid),
      outstanding: Number(row.outstanding),
      balance: Number(row.balance),
    })),
    total,
    pageSize: CUSTOMERS_PAGE_SIZE,
  };
}

export async function getCustomersOwingSummary() {
  const rows = await prisma.$queryRaw<{ count: bigint; totalOwed: string }[]>`
    SELECT COUNT(*)::bigint AS count, COALESCE(SUM(-balance), 0)::numeric AS "totalOwed"
    FROM "Customer"
    WHERE balance < 0
  `;

  return {
    count: Number(rows[0]?.count ?? 0),
    totalOwed: Number(rows[0]?.totalOwed ?? 0),
  };
}

export async function getCustomerOptions() {
  const customers = await prisma.customer.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      address: true,
      notes: true,
      balance: true,
    },
  });

  return customers.map((customer) => ({
    ...customer,
    balance: Number(customer.balance),
  }));
}

export async function getCustomerById(id: string) {
  return prisma.customer.findUnique({ where: { id } });
}

/**
 * Fuzzy name/phone search used by the customer picker, combining an exact
 * phone match with pg_trgm similarity over the normalized name so Arabic
 * diacritic/alef variants and minor typos still surface the right customer.
 */
export async function searchCustomers(query: string, excludeId?: string) {
  const trimmed = query.trim();
  if (!trimmed) {
    return prisma.customer.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, name: true, phone: true, email: true },
    });
  }

  const normalized = normalizeArabicName(trimmed);
  const excludeClause = excludeId
    ? Prisma.sql`AND id != ${excludeId}`
    : Prisma.empty;

  return prisma.$queryRaw<
    { id: string; name: string; phone: string; email: string | null }[]
  >`
    SELECT id, name, phone, email
    FROM "Customer"
    WHERE (phone ILIKE ${"%" + trimmed + "%"} OR similarity("nameNormalized", ${normalized}) > 0.2)
      ${excludeClause}
    ORDER BY similarity("nameNormalized", ${normalized}) DESC
    LIMIT 8
  `;
}

/**
 * Duplicate-customer check used while adding/editing a customer: phone
 * numbers are exact identifiers (unlike names, which vary in spelling), so
 * this looks for an exact match rather than a fuzzy one.
 */
export async function findCustomerByPhone(phone: string, excludeId?: string) {
  const trimmed = phone.trim();
  if (trimmed.length < 6) return [];

  const excludeClause = excludeId
    ? Prisma.sql`AND id != ${excludeId}`
    : Prisma.empty;

  const rows = await prisma.$queryRaw<
    { id: string; name: string; phone: string; email: string | null }[]
  >`
    SELECT id, name, phone, email
    FROM "Customer"
    WHERE phone = ${trimmed}
      ${excludeClause}
    LIMIT 5
  `;
  return rows;
}

export async function getCustomerProfile(id: string) {
  const customer = await prisma.customer.findUnique({ where: { id } });
  if (!customer) return null;

  const [orders, invoices, balanceHistory] = await Promise.all([
    prisma.order.findMany({
      where: { customerId: id },
      orderBy: { createdAt: "desc" },
      include: { items: { include: { product: { select: { name: true } } } } },
    }),
    prisma.invoice.findMany({
      where: { customerId: id },
      orderBy: { createdAt: "desc" },
      include: {
        items: true,
        payments: { orderBy: { createdAt: "desc" } },
      },
    }),
    prisma.customerBalanceHistory.findMany({
      where: { customerId: id },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const totalPurchased = invoices.reduce(
    (sum, invoice) => sum + Number(invoice.total),
    0,
  );
  const totalPaid = invoices.reduce(
    (sum, invoice) => sum + Number(invoice.paidAmount),
    0,
  );

  const payments = invoices
    .flatMap((invoice) =>
      invoice.payments.map((payment) => ({
        ...payment,
        invoiceNumber: invoice.invoiceNumber,
        invoiceId: invoice.id,
      })),
    )
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return {
    customer,
    orders,
    invoices,
    payments,
    balanceHistory,
    totals: { totalPurchased, totalPaid, balance: Number(customer.balance) },
  };
}
