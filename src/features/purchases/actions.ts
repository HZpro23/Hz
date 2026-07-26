"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import {
  purchaseOrderSchema,
  purchaseOrderItemsSchema,
} from "@/features/purchases/schema";

type ActionResult = { error?: string; success?: boolean };

function generatePurchaseOrderNumber() {
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `PO-${random}`;
}

export async function createPurchaseOrder(
  input: unknown,
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { error: "غير مصرح" };

  const parsed = purchaseOrderSchema.safeParse(input);
  if (!parsed.success) return { error: "الرجاء التحقق من البيانات المدخلة" };

  const total = parsed.data.items.reduce(
    (sum, item) => sum + item.quantity * item.unitCost,
    0,
  );

  const order = await prisma.purchaseOrder.create({
    data: {
      orderNumber: generatePurchaseOrderNumber(),
      supplierId: parsed.data.supplierId,
      language: parsed.data.language,
      total,
      items: {
        create: parsed.data.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitCost: item.unitCost,
        })),
      },
    },
  });

  revalidatePath("/dashboard/purchases");
  redirect(`/dashboard/purchases/${order.id}`);
}

/**
 * Replaces a purchase order's items and recomputes its total. Allowed at
 * any status, including after receipt — but deliberately does NOT touch
 * product quantities or inventory movements, since those were already
 * recorded against whatever items existed at receive time. Editing items
 * afterward is purely a correction to the order's own record; if the stock
 * itself needs adjusting too, that's a separate manual inventory action.
 */
export async function updatePurchaseOrderItems(
  id: string,
  input: unknown,
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { error: "غير مصرح" };

  const parsed = purchaseOrderItemsSchema.safeParse(input);
  if (!parsed.success) return { error: "الرجاء التحقق من البيانات المدخلة" };

  const order = await prisma.purchaseOrder.findUnique({ where: { id } });
  if (!order) return { error: "أمر الشراء غير موجود" };

  const total = parsed.data.items.reduce(
    (sum, item) => sum + item.quantity * item.unitCost,
    0,
  );

  try {
    await prisma.$transaction([
      prisma.purchaseOrderItem.deleteMany({ where: { purchaseOrderId: id } }),
      prisma.purchaseOrderItem.createMany({
        data: parsed.data.items.map((item) => ({
          purchaseOrderId: id,
          productId: item.productId,
          quantity: item.quantity,
          unitCost: item.unitCost,
        })),
      }),
      prisma.purchaseOrder.update({ where: { id }, data: { total } }),
    ]);
  } catch {
    return { error: "حدث خطأ أثناء تحديث عناصر أمر الشراء" };
  }

  revalidatePath("/dashboard/purchases");
  revalidatePath(`/dashboard/purchases/${id}`);
  return { success: true };
}

export async function receivePurchaseOrder(id: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { error: "غير مصرح" };

  const order = await prisma.purchaseOrder.findUnique({
    where: { id },
    include: { items: true },
  });
  if (!order) return { error: "أمر الشراء غير موجود" };
  if (order.status !== "PENDING") {
    return { error: "لا يمكن استلام هذا الأمر مرة أخرى" };
  }

  await prisma.$transaction([
    prisma.purchaseOrder.update({
      where: { id },
      data: { status: "RECEIVED", receivedAt: new Date() },
    }),
    ...order.items.map((item) =>
      prisma.product.update({
        where: { id: item.productId },
        data: { quantity: { increment: item.quantity } },
      }),
    ),
    ...order.items.map((item) =>
      prisma.inventoryMovement.create({
        data: {
          productId: item.productId,
          type: "IN",
          quantity: item.quantity,
          reference: order.orderNumber,
          reason: "استلام أمر شراء",
        },
      }),
    ),
  ]);

  revalidatePath("/dashboard/purchases");
  revalidatePath(`/dashboard/purchases/${id}`);
  revalidatePath("/dashboard/inventory");
  revalidatePath("/dashboard/products");
  return { success: true };
}

export async function cancelPurchaseOrder(id: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { error: "غير مصرح" };

  const order = await prisma.purchaseOrder.findUnique({ where: { id } });
  if (!order) return { error: "أمر الشراء غير موجود" };
  if (order.status !== "PENDING") {
    return { error: "لا يمكن إلغاء هذا الأمر" };
  }

  await prisma.purchaseOrder.update({
    where: { id },
    data: { status: "CANCELLED" },
  });

  revalidatePath("/dashboard/purchases");
  revalidatePath(`/dashboard/purchases/${id}`);
  return { success: true };
}

export async function deletePurchaseOrder(id: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { error: "غير مصرح" };

  try {
    await prisma.purchaseOrder.delete({ where: { id } });
  } catch {
    return { error: "تعذر حذف أمر الشراء" };
  }

  revalidatePath("/dashboard/purchases");
  return { success: true };
}

export async function deletePurchaseOrders(
  ids: string[],
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { error: "غير مصرح" };
  if (ids.length === 0) return { success: true };

  let failedCount = 0;
  for (const id of ids) {
    try {
      await prisma.purchaseOrder.delete({ where: { id } });
    } catch {
      failedCount++;
    }
  }

  revalidatePath("/dashboard/purchases");

  if (failedCount > 0) {
    return { error: `تعذر حذف ${failedCount} من أوامر الشراء` };
  }
  return { success: true };
}
