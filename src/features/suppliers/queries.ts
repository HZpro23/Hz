import "server-only";
import { prisma } from "@/lib/prisma";

export const SUPPLIERS_PAGE_SIZE = 10;

export async function getSuppliersPage({
  query,
  page,
}: {
  query?: string;
  page: number;
}) {
  const where = query
    ? { name: { contains: query, mode: "insensitive" as const } }
    : {};

  const [items, total] = await Promise.all([
    prisma.supplier.findMany({
      where,
      include: { _count: { select: { purchaseOrders: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * SUPPLIERS_PAGE_SIZE,
      take: SUPPLIERS_PAGE_SIZE,
    }),
    prisma.supplier.count({ where }),
  ]);

  return { items, total, pageSize: SUPPLIERS_PAGE_SIZE };
}

export async function getSupplierOptions() {
  return prisma.supplier.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

export async function getSupplierById(id: string) {
  return prisma.supplier.findUnique({ where: { id } });
}

export async function getSupplierProfile(id: string) {
  const supplier = await prisma.supplier.findUnique({ where: { id } });
  if (!supplier) return null;

  const purchaseOrders = await prisma.purchaseOrder.findMany({
    where: { supplierId: id },
    orderBy: { createdAt: "desc" },
    include: {
      items: true,
      payments: { orderBy: { createdAt: "desc" } },
    },
  });

  const totalPurchased = purchaseOrders.reduce(
    (sum, order) => sum + Number(order.total),
    0,
  );
  const totalPaid = purchaseOrders.reduce(
    (sum, order) => sum + Number(order.paidAmount),
    0,
  );
  const totalOutstanding = purchaseOrders.reduce(
    (sum, order) =>
      sum + Math.max(0, Number(order.total) - Number(order.paidAmount)),
    0,
  );

  const payments = purchaseOrders
    .flatMap((order) =>
      order.payments.map((payment) => ({
        ...payment,
        orderNumber: order.orderNumber,
        purchaseOrderId: order.id,
      })),
    )
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return {
    supplier,
    purchaseOrders,
    payments,
    totals: { totalPurchased, totalPaid, totalOutstanding },
  };
}
