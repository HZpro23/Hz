import "server-only";
import { prisma } from "@/lib/prisma";
import type { Prisma, PaymentStatus } from "@/generated/prisma/client";

export const INVOICES_PAGE_SIZE = 10;

export async function getInvoicesPage({
  query,
  paymentStatus,
  page,
}: {
  query?: string;
  paymentStatus?: PaymentStatus;
  page: number;
}) {
  const where: Prisma.InvoiceWhereInput = {
    ...(query
      ? {
          OR: [
            { invoiceNumber: { contains: query, mode: "insensitive" } },
            { customerName: { contains: query, mode: "insensitive" } },
            { customerPhone: { contains: query, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(paymentStatus ? { paymentStatus } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      include: { _count: { select: { items: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * INVOICES_PAGE_SIZE,
      take: INVOICES_PAGE_SIZE,
    }),
    prisma.invoice.count({ where }),
  ]);

  return { items, total, pageSize: INVOICES_PAGE_SIZE };
}

export async function getInvoiceById(id: string) {
  return prisma.invoice.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          product: { select: { name: true, sku: true, weight: true } },
        },
      },
      order: { select: { id: true } },
      payments: { orderBy: { createdAt: "desc" } },
    },
  });
}

/**
 * Other invoices settled in the same payment session as this one — used for
 * "الحساب القديم" on an invoice's print page. Rather than listing whatever
 * happens to still be unpaid (which could include invoices this payment had
 * nothing to do with), this looks at which other invoices got a Payment row
 * under the same batchId as this invoice's own payment(s) — i.e. invoices
 * the admin explicitly chose to pay off together with this one via
 * تسجيل دفعة's multi-invoice picker (or an overpayment distributed at
 * invoice-creation time).
 */
export async function getBatchSettledInvoices(invoiceId: string) {
  const ownPayments = await prisma.payment.findMany({
    where: { invoiceId, batchId: { not: null } },
    select: { batchId: true },
  });
  const batchIds = [
    ...new Set(
      ownPayments
        .map((payment) => payment.batchId)
        .filter((batchId): batchId is string => Boolean(batchId)),
    ),
  ];
  if (batchIds.length === 0) return [];

  const otherPayments = await prisma.payment.findMany({
    where: { batchId: { in: batchIds }, NOT: { invoiceId } },
    include: {
      invoice: {
        select: {
          id: true,
          invoiceNumber: true,
          total: true,
          paidAmount: true,
          paymentStatus: true,
          createdAt: true,
        },
      },
    },
  });

  const byInvoice = new Map<
    string,
    { invoice: (typeof otherPayments)[number]["invoice"]; amountInBatch: number }
  >();
  for (const payment of otherPayments) {
    const key = payment.invoice.id;
    const amount = Number(payment.amount);
    const existing = byInvoice.get(key);
    if (existing) {
      existing.amountInBatch += amount;
    } else {
      byInvoice.set(key, { invoice: payment.invoice, amountInBatch: amount });
    }
  }

  return [...byInvoice.values()].sort(
    (a, b) => a.invoice.createdAt.getTime() - b.invoice.createdAt.getTime(),
  );
}

/** All of a customer's invoices that aren't fully paid yet (UNPAID or
 * PARTIALLY_PAID), oldest first — used by the "تسجيل دفعة" dialog to let the
 * admin distribute one payment across multiple invoices instead of only the
 * one they opened the dialog from. */
export async function getCustomerOutstandingInvoices(customerId: string) {
  return prisma.invoice.findMany({
    where: {
      customerId,
      paymentStatus: { in: ["UNPAID", "PARTIALLY_PAID"] },
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      invoiceNumber: true,
      total: true,
      paidAmount: true,
      paymentStatus: true,
      createdAt: true,
    },
  });
}

export async function getOutstandingInvoicesSummary() {
  const rows = await prisma.invoice.findMany({
    where: { paymentStatus: { in: ["UNPAID", "PARTIALLY_PAID"] } },
    select: { total: true, paidAmount: true },
  });

  return {
    count: rows.length,
    totalOutstanding: rows.reduce(
      (sum, row) => sum + (Number(row.total) - Number(row.paidAmount)),
      0,
    ),
  };
}
