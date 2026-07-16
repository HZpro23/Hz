"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import {
  orderItemsSchema,
  reassignOrderCustomerSchema,
  createOrderSchema,
} from "@/features/orders/schema";
import type { OrderStatus } from "@/generated/prisma/client";

type ActionResult = { error?: string; success?: boolean };

function generateOrderNumber(): string {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `ORD-${timestamp}-${random}`;
}

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

export async function updateOrderItems(
  orderId: string,
  input: unknown,
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { error: "غير مصرح" };

  const parsed = orderItemsSchema.safeParse(input);
  if (!parsed.success) return { error: "الرجاء التحقق من البيانات المدخلة" };

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order) return { error: "الطلب غير موجود" };

  const dataById = new Map(
    parsed.data.items.map((item) => [item.id, item]),
  );
  const total = order.items.reduce((sum, item) => {
    const edited = dataById.get(item.id);
    const price = edited?.price ?? Number(item.price);
    const quantity = edited?.quantity ?? item.quantity;
    return sum + price * quantity;
  }, 0);

  await prisma.$transaction([
    ...order.items
      .filter((item) => dataById.has(item.id))
      .map((item) => {
        const edited = dataById.get(item.id)!;
        return prisma.orderItem.update({
          where: { id: item.id },
          data: { price: edited.price, quantity: edited.quantity },
        });
      }),
    prisma.order.update({ where: { id: orderId }, data: { total } }),
  ]);

  revalidatePath("/dashboard/orders");
  revalidatePath(`/dashboard/orders/${orderId}`);
  revalidatePath("/dashboard");
  return { success: true };
}

export async function reassignOrderCustomer(
  orderId: string,
  input: unknown,
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { error: "غير مصرح" };

  const parsed = reassignOrderCustomerSchema.safeParse(input);
  if (!parsed.success) return { error: "الرجاء التحقق من البيانات المدخلة" };

  const customer = await prisma.customer.findUnique({
    where: { id: parsed.data.customerId },
  });
  if (!customer) return { error: "العميل غير موجود" };

  await prisma.order.update({
    where: { id: orderId },
    data: {
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      customerEmail: customer.email,
    },
  });

  revalidatePath("/dashboard/orders");
  revalidatePath(`/dashboard/orders/${orderId}`);
  return { success: true };
}

export async function createOrder(input: unknown): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { error: "غير مصرح" };

  const parsed = createOrderSchema.safeParse(input);
  if (!parsed.success) return { error: "الرجاء التحقق من البيانات المدخلة" };

  const customer = await prisma.customer.findUnique({
    where: { id: parsed.data.customerId },
  });
  if (!customer) return { error: "العميل غير موجود" };

  const products = await prisma.product.findMany({
    where: { id: { in: parsed.data.items.map((item) => item.productId) } },
  });
  const productById = new Map(products.map((product) => [product.id, product]));

  for (const item of parsed.data.items) {
    const product = productById.get(item.productId);
    if (!product) return { error: "أحد المنتجات غير موجود" };
    if (item.quantity > product.quantity) {
      return {
        error: `الكمية المطلوبة من "${product.name}" أكبر من الكمية المتوفرة في المخزون`,
      };
    }
  }

  const total = parsed.data.items.reduce(
    (sum, item) => sum + item.quantity * item.price,
    0,
  );

  let orderId: string;
  try {
    const order = await prisma.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        customerId: customer.id,
        customerName: customer.name,
        customerPhone: customer.phone,
        customerEmail: customer.email,
        notes: parsed.data.notes || null,
        total,
        items: {
          create: parsed.data.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
          })),
        },
      },
    });
    orderId = order.id;
  } catch {
    return { error: "حدث خطأ أثناء إنشاء الطلب" };
  }

  revalidatePath("/dashboard/orders");
  revalidatePath("/dashboard");
  redirect(`/dashboard/orders/${orderId}`);
}

export async function deleteOrder(id: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { error: "غير مصرح" };

  try {
    await prisma.order.delete({ where: { id } });
  } catch {
    return { error: "لا يمكن حذف هذا الطلب لارتباطه بفاتورة سابقة" };
  }

  revalidatePath("/dashboard/orders");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteOrders(ids: string[]): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { error: "غير مصرح" };
  if (ids.length === 0) return { success: true };

  let failedCount = 0;
  for (const id of ids) {
    try {
      await prisma.order.delete({ where: { id } });
    } catch {
      failedCount++;
    }
  }

  revalidatePath("/dashboard/orders");
  revalidatePath("/dashboard");

  if (failedCount > 0) {
    return {
      error: `تعذر حذف ${failedCount} من الطلبات لارتباطها بفواتير سابقة`,
    };
  }
  return { success: true };
}
