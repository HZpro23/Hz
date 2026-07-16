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
        include: { product: { select: { name: true, sku: true } } },
      },
      order: { select: { id: true } },
      payments: { orderBy: { createdAt: "desc" } },
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
