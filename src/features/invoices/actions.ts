"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { invoiceSchema } from "@/features/invoices/schema";
import { computePaymentStatus } from "@/lib/money";
import type {
  InvoiceLanguage,
  PaymentMethod,
  PaymentStatus,
} from "@/generated/prisma/client";

type ActionResult = { error?: string; success?: boolean };

function generateInvoiceNumber() {
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `INV-${random}`;
}

function computeTotal(items: { quantity: number; unitPrice: number }[]) {
  return items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
}

function resolvePaidAmount(total: number, paymentStatus: PaymentStatus, paidAmount: number) {
  if (paymentStatus === "PAID") return total;
  if (paymentStatus === "UNPAID") return 0;
  return Math.max(0, Math.min(paidAmount, total));
}

export async function createInvoice(input: unknown): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { error: "غير مصرح" };

  const parsed = invoiceSchema.safeParse(input);
  if (!parsed.success) return { error: "الرجاء التحقق من البيانات المدخلة" };

  const total = computeTotal(parsed.data.items);
  const paidAmount = resolvePaidAmount(
    total,
    parsed.data.paymentStatus,
    parsed.data.paidAmount,
  );
  const paymentStatus = computePaymentStatus(total, paidAmount);

  let invoiceId: string;
  try {
    const invoice = await prisma.$transaction(async (tx) => {
      const created = await tx.invoice.create({
        data: {
          invoiceNumber: generateInvoiceNumber(),
          language: parsed.data.language,
          customerId: parsed.data.customerId,
          customerName: parsed.data.customerName,
          customerPhone: parsed.data.customerPhone,
          customerEmail: parsed.data.customerEmail || null,
          notes: parsed.data.notes || null,
          orderId: parsed.data.orderId || null,
          total,
          paymentMethod: parsed.data.paymentMethod,
          paymentStatus,
          paidAmount,
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

      if (paidAmount > 0) {
        await tx.payment.create({
          data: {
            invoiceId: created.id,
            amount: paidAmount,
            method: parsed.data.paymentMethod,
          },
        });
      }

      return created;
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

  const existing = await prisma.invoice.findUnique({ where: { id } });
  if (!existing) return { error: "الفاتورة غير موجودة" };

  const total = computeTotal(parsed.data.items);
  // Line-item/total edits must not silently erase payments already recorded;
  // re-derive status against the (possibly unchanged) paidAmount already on file.
  const paidAmount = Math.min(Number(existing.paidAmount), total);
  const paymentStatus = computePaymentStatus(total, paidAmount);

  try {
    await prisma.$transaction([
      prisma.invoiceItem.deleteMany({ where: { invoiceId: id } }),
      prisma.invoice.update({
        where: { id },
        data: {
          language: parsed.data.language,
          customerId: parsed.data.customerId,
          customerName: parsed.data.customerName,
          customerPhone: parsed.data.customerPhone,
          customerEmail: parsed.data.customerEmail || null,
          notes: parsed.data.notes || null,
          total,
          paidAmount,
          paymentStatus,
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

export async function deleteInvoices(ids: string[]): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { error: "غير مصرح" };
  if (ids.length === 0) return { success: true };

  await prisma.invoice.deleteMany({ where: { id: { in: ids } } });

  revalidatePath("/dashboard/invoices");
  return { success: true };
}

export async function getOrCreateInvoiceForOrder(
  orderId: string,
  options: {
    language: InvoiceLanguage;
    paymentMethod: PaymentMethod;
    paymentStatus: PaymentStatus;
    paidAmount: number;
  },
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

  const total = Number(order.total);
  const paidAmount = resolvePaidAmount(
    total,
    options.paymentStatus,
    options.paidAmount,
  );
  const paymentStatus = computePaymentStatus(total, paidAmount);

  const invoice = await prisma.$transaction(async (tx) => {
    const created = await tx.invoice.create({
      data: {
        invoiceNumber: generateInvoiceNumber(),
        language: options.language,
        customerId: order.customerId,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        customerEmail: order.customerEmail,
        orderId: order.id,
        total: order.total,
        paymentMethod: options.paymentMethod,
        paymentStatus,
        paidAmount,
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

    if (paidAmount > 0) {
      await tx.payment.create({
        data: {
          invoiceId: created.id,
          amount: paidAmount,
          method: options.paymentMethod,
        },
      });
    }

    return created;
  });

  revalidatePath("/dashboard/invoices");
  redirect(`/dashboard/invoices/${invoice.id}`);
}

export async function recordPayment(
  invoiceId: string,
  input: { amount: number; method: PaymentMethod; note?: string },
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { error: "غير مصرح" };

  if (!(input.amount > 0)) {
    return { error: "الرجاء إدخال مبلغ صحيح" };
  }

  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice) return { error: "الفاتورة غير موجودة" };

  const total = Number(invoice.total);
  const currentPaid = Number(invoice.paidAmount);
  const remaining = total - currentPaid;

  if (input.amount > remaining + 0.01) {
    return { error: "المبلغ المدخل يتجاوز المبلغ المتبقي على الفاتورة" };
  }

  const newPaidAmount = currentPaid + input.amount;
  const paymentStatus = computePaymentStatus(total, newPaidAmount);

  await prisma.$transaction([
    prisma.payment.create({
      data: {
        invoiceId,
        amount: input.amount,
        method: input.method,
        note: input.note || null,
      },
    }),
    prisma.invoice.update({
      where: { id: invoiceId },
      data: { paidAmount: newPaidAmount, paymentStatus },
    }),
  ]);

  revalidatePath(`/dashboard/invoices/${invoiceId}`);
  revalidatePath("/dashboard/invoices");
  if (invoice.customerId) {
    revalidatePath(`/dashboard/customers/${invoice.customerId}`);
  }
  return { success: true };
}
