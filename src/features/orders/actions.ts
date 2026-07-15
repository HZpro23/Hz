"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { orderItemPricesSchema } from "@/features/orders/schema";
import type { OrderStatus } from "@/generated/prisma/client";

type ActionResult = { error?: string; success?: boolean };

const VALID_STATUSES: OrderStatus[] = [
  "PENDING",
  "PROCESSING",
  "COMPLETED",
  "CANCELLED",
];

export async function updateOrderStatus(
  id: string,
  status: string,
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { error: "غير مصرح" };

  if (!VALID_STATUSES.includes(status as OrderStatus)) {
    return { error: "حالة غير صحيحة" };
  }

  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: { include: { product: true } } },
  });
  if (!order) return { error: "الطلب غير موجود" };

  const completingNow = status === "COMPLETED" && order.status !== "COMPLETED";

  if (completingNow) {
    for (const item of order.items) {
      if (item.quantity > item.product.quantity) {
        return {
          error: `الكمية المطلوبة من "${item.product.name}" أكبر من الكمية المتوفرة في المخزون`,
        };
      }
    }

    await prisma.$transaction([
      prisma.order.update({
        where: { id },
        data: { status: status as OrderStatus },
      }),
      ...order.items.map((item) =>
        prisma.product.update({
          where: { id: item.productId },
          data: { quantity: { decrement: item.quantity } },
        }),
      ),
      ...order.items.map((item) =>
        prisma.inventoryMovement.create({
          data: {
            productId: item.productId,
            type: "OUT",
            quantity: item.quantity,
            reason: `اكتمال الطلب رقم ${order.orderNumber}`,
          },
        }),
      ),
    ]);
  } else {
    await prisma.order.update({
      where: { id },
      data: { status: status as OrderStatus },
    });
  }

  revalidatePath("/dashboard/orders");
  revalidatePath(`/dashboard/orders/${id}`);
  revalidatePath("/dashboard/products");
  revalidatePath("/dashboard/inventory");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateOrderItemPrices(
  orderId: string,
  input: unknown,
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { error: "غير مصرح" };

  const parsed = orderItemPricesSchema.safeParse(input);
  if (!parsed.success) return { error: "الرجاء التحقق من البيانات المدخلة" };

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order) return { error: "الطلب غير موجود" };

  const priceById = new Map(
    parsed.data.items.map((item) => [item.id, item.price]),
  );
  const total = order.items.reduce(
    (sum, item) => sum + (priceById.get(item.id) ?? Number(item.price)) * item.quantity,
    0,
  );

  await prisma.$transaction([
    ...order.items
      .filter((item) => priceById.has(item.id))
      .map((item) =>
        prisma.orderItem.update({
          where: { id: item.id },
          data: { price: priceById.get(item.id)! },
        }),
      ),
    prisma.order.update({ where: { id: orderId }, data: { total } }),
  ]);

  revalidatePath("/dashboard/orders");
  revalidatePath(`/dashboard/orders/${orderId}`);
  revalidatePath("/dashboard");
  return { success: true };
}
