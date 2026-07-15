"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { invoiceSchema } from "@/features/invoices/schema";
import type { InvoiceLanguage } from "@/generated/prisma/client";

type ActionResult = { error?: string; success?: boolean };

function generateInvoiceNumber() {
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `INV-${random}`;
}

function computeTotal(items: { quantity: number; unitPrice: number }[]) {
  return items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
}

export async function createInvoice(input: unknown): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { error: "غير مصرح" };

  const parsed = invoiceSchema.safeParse(input);
  if (!parsed.success) return { error: "الرجاء التحقق من البيانات المدخلة" };

  let invoiceId: string;
  try {
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: generateInvoiceNumber(),
        language: parsed.data.language,
        customerName: parsed.data.customerName,
        customerPhone: parsed.data.customerPhone,
        customerEmail: parsed.data.customerEmail || null,
        notes: parsed.data.notes || null,
        orderId: parsed.data.orderId || null,
        total: computeTotal(parsed.data.items),
        items: {
          create: parsed.data.items.map((item) => ({
            productId: item.productId || null,
            name: item.name,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          })),
        },
      },
    });
    invoiceId = invoice.id;
  } catch {
    return { error: "حدث خطأ أثناء إنشاء الفاتورة" };
  }

  revalidatePath("/dashboard/invoices");
  redirect(`/dashboard/invoices/${invoiceId}`);
}

export async function updateInvoice(
  id: string,
  input: unknown,
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { error: "غير مصرح" };

  const parsed = invoiceSchema.safeParse(input);
  if (!parsed.success) return { error: "الرجاء التحقق من البيانات المدخلة" };

  try {
    await prisma.$transaction([
      prisma.invoiceItem.deleteMany({ where: { invoiceId: id } }),
      prisma.invoice.update({
        where: { id },
        data: {
          language: parsed.data.language,
          customerName: parsed.data.customerName,
          customerPhone: parsed.data.customerPhone,
          customerEmail: parsed.data.customerEmail || null,
          notes: parsed.data.notes || null,
          total: computeTotal(parsed.data.items),
          items: {
            create: parsed.data.items.map((item) => ({
              productId: item.productId || null,
              name: item.name,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
            })),
          },
        },
      }),
    ]);
  } catch {
    return { error: "حدث خطأ أثناء تحديث الفاتورة" };
  }

  revalidatePath("/dashboard/invoices");
  revalidatePath(`/dashboard/invoices/${id}`);
  return { success: true };
}

export async function deleteInvoice(id: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { error: "غير مصرح" };

  await prisma.invoice.delete({ where: { id } });

  revalidatePath("/dashboard/invoices");
  return { success: true };
}

export async function getOrCreateInvoiceForOrder(
  orderId: string,
  language: InvoiceLanguage,
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { error: "غير مصرح" };

  const existing = await prisma.invoice.findUnique({
    where: { orderId },
  });

  if (existing) {
    redirect(`/dashboard/invoices/${existing.id}`);
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: { include: { product: true } } },
  });
  if (!order) return { error: "الطلب غير موجود" };

  const invoice = await prisma.invoice.create({
    data: {
      invoiceNumber: generateInvoiceNumber(),
      language,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      customerEmail: order.customerEmail,
      orderId: order.id,
      total: order.total,
      items: {
        create: order.items.map((item) => ({
          productId: item.productId,
          name: item.product.name,
          quantity: item.quantity,
          unitPrice: item.price,
        })),
      },
    },
  });

  revalidatePath("/dashboard/invoices");
  redirect(`/dashboard/invoices/${invoice.id}`);
}

// Thin wrapper for use directly as a <form action>: form actions must
// return void | Promise<void>, while getOrCreateInvoiceForOrder returns
// an ActionResult on the (non-redirecting) error path.
export async function generateInvoiceForOrder(
  orderId: string,
  language: InvoiceLanguage,
) {
  await getOrCreateInvoiceForOrder(orderId, language);
}
