"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
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
