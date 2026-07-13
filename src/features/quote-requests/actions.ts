"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import {
  createQuoteRequestSchema,
  quoteResponseSchema,
} from "@/features/quote-requests/schema";
import type { QuoteStatus } from "@/generated/prisma/client";

type ActionResult = { error?: string; success?: boolean };

export async function submitQuoteRequest(input: unknown): Promise<ActionResult> {
  const parsed = createQuoteRequestSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "الرجاء التحقق من البيانات المدخلة" };
  }

  await prisma.quoteRequest.create({
    data: {
      customerName: parsed.data.customerName,
      phone: parsed.data.phone,
      email: parsed.data.email || null,
      quantity: parsed.data.quantity,
      notes: parsed.data.notes || null,
      productId: parsed.data.productId || null,
    },
  });

  revalidatePath("/dashboard/quote-requests");
  return { success: true };
}

export async function saveQuoteResponse(
  id: string,
  input: unknown,
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { error: "غير مصرح" };

  const parsed = quoteResponseSchema.safeParse(input);
  if (!parsed.success) return { error: "الرجاء التحقق من البيانات المدخلة" };

  const existing = await prisma.quoteRequest.findUnique({
    where: { id },
    include: { product: true },
  });
  if (!existing) return { error: "الطلب غير موجود" };
  if (existing.product && existing.product.quantity <= 0) {
    return { error: "لا يمكن حفظ عرض السعر لأن كمية المنتج في المخزون صفر" };
  }

  await prisma.quoteRequest.update({
    where: { id },
    data: {
      price: parsed.data.price,
      message: parsed.data.message || null,
      status: existing.status === "PENDING" ? "QUOTED" : existing.status,
    },
  });

  revalidatePath("/dashboard/quote-requests");
  revalidatePath(`/dashboard/quote-requests/${id}`);
  return { success: true };
}

const VALID_STATUSES: QuoteStatus[] = [
  "PENDING",
  "QUOTED",
  "SENT",
  "ACCEPTED",
  "REJECTED",
];

export async function updateQuoteStatus(
  id: string,
  status: string,
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { error: "غير مصرح" };

  if (!VALID_STATUSES.includes(status as QuoteStatus)) {
    return { error: "حالة غير صحيحة" };
  }

  await prisma.quoteRequest.update({
    where: { id },
    data: { status: status as QuoteStatus },
  });

  revalidatePath("/dashboard/quote-requests");
  revalidatePath(`/dashboard/quote-requests/${id}`);
  return { success: true };
}

function generateOrderNumber() {
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `ORD-${random}`;
}

export async function convertQuoteToOrder(id: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { error: "غير مصرح" };

  const quote = await prisma.quoteRequest.findUnique({
    where: { id },
    include: { order: true, product: true },
  });

  if (!quote) return { error: "الطلب غير موجود" };
  if (quote.status !== "ACCEPTED") {
    return { error: "يجب أن يكون الطلب مقبولاً قبل تحويله إلى طلب شراء" };
  }
  if (quote.order) return { error: "تم تحويل هذا الطلب مسبقاً" };
  if (!quote.productId || quote.price === null) {
    return { error: "لا يمكن التحويل بدون منتج وسعر محددين" };
  }
  if (quote.product && quote.product.quantity <= 0) {
    return { error: "لا يمكن التحويل لأن كمية المنتج في المخزون صفر" };
  }

  const customer =
    (await prisma.customer.findFirst({ where: { phone: quote.phone } })) ??
    (await prisma.customer.create({
      data: { name: quote.customerName, phone: quote.phone },
    }));

  const order = await prisma.order.create({
    data: {
      orderNumber: generateOrderNumber(),
      customerId: customer.id,
      quoteRequestId: quote.id,
      total: quote.price.mul(quote.quantity),
      items: {
        create: [
          {
            productId: quote.productId,
            quantity: quote.quantity,
            price: quote.price,
          },
        ],
      },
    },
  });

  revalidatePath("/dashboard/quote-requests");
  revalidatePath("/dashboard/orders");
  redirect(`/dashboard/orders/${order.id}`);
}
