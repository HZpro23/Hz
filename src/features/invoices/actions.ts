"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { invoiceSchema } from "@/features/invoices/schema";
import { computePaymentStatus } from "@/lib/money";
import { adjustCustomerBalance, computeBalanceEffect } from "@/features/customers/balance";
import { ar } from "@/i18n/ar";
import type {
  InvoiceLanguage,
  PaymentMethod,
  BalanceChangeReason,
  Prisma,
} from "@/generated/prisma/client";

type ActionResult = { error?: string; success?: boolean };

function generateInvoiceNumber() {
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `INV-${random}`;
}

function computeTotal(items: { quantity: number; unitPrice: number }[]) {
  return items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
}

function balanceEffectReason(delta: number): BalanceChangeReason {
  return delta < 0 ? "BALANCE_USED" : "OVERPAYMENT_CREDIT";
}

export async function createInvoice(input: unknown): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { error: "غير مصرح" };

  const parsed = invoiceSchema.safeParse(input);
  if (!parsed.success) return { error: "الرجاء التحقق من البيانات المدخلة" };

  const total = computeTotal(parsed.data.items);
  const payments = parsed.data.payments.filter((line) => line.amount > 0);
  const paidAmount = payments.reduce((sum, line) => sum + line.amount, 0);
  const paymentStatus = computePaymentStatus(total, paidAmount);
  const primaryMethod = payments[0]?.method ?? "CASH";
  const customerId = parsed.data.customerId;
  const balanceEffect = computeBalanceEffect(total, payments);

  let invoiceId: string;
  try {
    invoiceId = await prisma.$transaction(async (tx) => {
      const created = await tx.invoice.create({
        data: {
          invoiceNumber: generateInvoiceNumber(),
          language: parsed.data.language,
          customerId,
          customerName: parsed.data.customerName,
          customerPhone: parsed.data.customerPhone,
          customerEmail: parsed.data.customerEmail || null,
          notes: parsed.data.notes || null,
          orderId: parsed.data.orderId || null,
          total,
          paymentMethod: primaryMethod,
          paymentStatus,
          paidAmount,
          balanceEffectApplied: balanceEffect,
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

      if (payments.length > 0) {
        await tx.payment.createMany({
          data: payments.map((line) => ({
            invoiceId: created.id,
            amount: line.amount,
            method: line.method,
          })),
        });
      }

      await adjustCustomerBalance(tx, customerId, balanceEffect, {
        reason: balanceEffectReason(balanceEffect),
        invoiceId: created.id,
        invoiceNumber: created.invoiceNumber,
      });

      return created.id;
    });
  } catch {
    return { error: "حدث خطأ أثناء إنشاء الفاتورة" };
  }

  revalidatePath("/dashboard/invoices");
  revalidatePath(`/dashboard/customers/${customerId}`);
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

  const existing = await prisma.invoice.findUnique({
    where: { id },
    include: { payments: true },
  });
  if (!existing) return { error: "الفاتورة غير موجودة" };

  const total = computeTotal(parsed.data.items);
  // Items/total edits never touch the payments already on file — رصيد only
  // ever moves because of من الرصيد or an over/under-paid total, both
  // captured by re-deriving the effect against the (unchanged) payments.
  const paidAmount = Number(existing.paidAmount);
  const paymentStatus = computePaymentStatus(total, paidAmount);
  const newBalanceEffect = computeBalanceEffect(
    total,
    existing.payments.map((p) => ({ amount: Number(p.amount), method: p.method })),
  );
  const previousBalanceEffect = Number(existing.balanceEffectApplied);
  const newCustomerId = parsed.data.customerId;

  try {
    await prisma.$transaction(async (tx) => {
      await tx.invoiceItem.deleteMany({ where: { invoiceId: id } });
      await tx.invoice.update({
        where: { id },
        data: {
          language: parsed.data.language,
          customerId: newCustomerId,
          customerName: parsed.data.customerName,
          customerPhone: parsed.data.customerPhone,
          customerEmail: parsed.data.customerEmail || null,
          notes: parsed.data.notes || null,
          total,
          paidAmount,
          paymentStatus,
          balanceEffectApplied: newBalanceEffect,
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

      if (existing.customerId === newCustomerId) {
        if (existing.customerId) {
          const delta = newBalanceEffect - previousBalanceEffect;
          await adjustCustomerBalance(tx, existing.customerId, delta, {
            reason: "INVOICE_EDIT",
            invoiceId: id,
            invoiceNumber: existing.invoiceNumber,
          });
        }
      } else {
        // Reassigned to a different customer: fully reverse the effect on
        // the old customer, then apply it fresh to the new one.
        if (existing.customerId) {
          await adjustCustomerBalance(tx, existing.customerId, -previousBalanceEffect, {
            reason: "INVOICE_EDIT",
            invoiceId: id,
            invoiceNumber: existing.invoiceNumber,
          });
        }
        await adjustCustomerBalance(tx, newCustomerId, newBalanceEffect, {
          reason: "INVOICE_EDIT",
          invoiceId: id,
          invoiceNumber: existing.invoiceNumber,
        });
      }
    });
  } catch {
    return { error: "حدث خطأ أثناء تحديث الفاتورة" };
  }

  revalidatePath("/dashboard/invoices");
  revalidatePath(`/dashboard/invoices/${id}`);
  if (existing.customerId) revalidatePath(`/dashboard/customers/${existing.customerId}`);
  if (newCustomerId !== existing.customerId) {
    revalidatePath(`/dashboard/customers/${newCustomerId}`);
  }
  return { success: true };
}

/**
 * Deleting an invoice can undo whatever lifetime effect it had on its
 * customer's رصيد — a من الرصيد draw (negative) or leftover overpayment
 * credit (positive) — but only if the admin explicitly opts in via
 * `applyBalanceChange`. Leaving it unset/false never touches رصيد and
 * never writes a history entry, regardless of which direction it would go.
 */
async function reverseInvoiceBalanceOnDelete(
  tx: Prisma.TransactionClient,
  invoice: {
    id: string;
    invoiceNumber: string;
    customerId: string | null;
    balanceEffectApplied: unknown;
  },
  applyBalanceChange?: boolean,
) {
  if (!invoice.customerId) return;

  const effect = Number(invoice.balanceEffectApplied);
  if (Math.abs(effect) <= 0.005 || !applyBalanceChange) return;

  const change = -effect;
  await adjustCustomerBalance(tx, invoice.customerId, change, {
    reason: change > 0 ? "BALANCE_RETURNED" : "INVOICE_CANCELLATION",
    invoiceId: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
  });
}

export async function deleteInvoice(
  id: string,
  options?: { applyBalanceChange?: boolean },
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { error: "غير مصرح" };

  const existing = await prisma.invoice.findUnique({ where: { id } });
  if (!existing) return { error: "الفاتورة غير موجودة" };

  await prisma.$transaction(async (tx) => {
    await reverseInvoiceBalanceOnDelete(tx, existing, options?.applyBalanceChange);
    await tx.invoice.delete({ where: { id } });
  });

  revalidatePath("/dashboard/invoices");
  if (existing.customerId) revalidatePath(`/dashboard/customers/${existing.customerId}`);
  return { success: true };
}

export async function deleteInvoices(
  decisions: { id: string; applyBalanceChange?: boolean }[],
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { error: "غير مصرح" };
  if (decisions.length === 0) return { success: true };

  const decisionById = new Map(decisions.map((d) => [d.id, d.applyBalanceChange]));
  const ids = decisions.map((d) => d.id);

  await prisma.$transaction(async (tx) => {
    const invoices = await tx.invoice.findMany({ where: { id: { in: ids } } });

    for (const invoice of invoices) {
      await reverseInvoiceBalanceOnDelete(tx, invoice, decisionById.get(invoice.id));
    }

    await tx.invoice.deleteMany({ where: { id: { in: ids } } });
  });

  revalidatePath("/dashboard/invoices");
  return { success: true };
}

export async function getOrCreateInvoiceForOrder(
  orderId: string,
  options: {
    language: InvoiceLanguage;
    payments: { method: PaymentMethod; amount: number }[];
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

  const payments = options.payments.filter((line) => line.amount > 0);

  if (payments.some((line) => line.method === "BALANCE") && !order.customerId) {
    return { error: ar.invoices.noCustomerForBalance };
  }

  const total = Number(order.total);
  const paidAmount = payments.reduce((sum, line) => sum + line.amount, 0);
  const paymentStatus = computePaymentStatus(total, paidAmount);
  const primaryMethod = payments[0]?.method ?? "CASH";
  const balanceEffect = computeBalanceEffect(total, payments);

  let invoiceId: string;
  try {
    invoiceId = await prisma.$transaction(async (tx) => {
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
          paymentMethod: primaryMethod,
          paymentStatus,
          paidAmount,
          balanceEffectApplied: balanceEffect,
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

      if (payments.length > 0) {
        await tx.payment.createMany({
          data: payments.map((line) => ({
            invoiceId: created.id,
            amount: line.amount,
            method: line.method,
          })),
        });
      }

      if (order.customerId) {
        await adjustCustomerBalance(tx, order.customerId, balanceEffect, {
          reason: balanceEffectReason(balanceEffect),
          invoiceId: created.id,
          invoiceNumber: created.invoiceNumber,
        });
      }

      return created.id;
    });
  } catch {
    return { error: "حدث خطأ أثناء إنشاء الفاتورة" };
  }

  revalidatePath("/dashboard/invoices");
  if (order.customerId) revalidatePath(`/dashboard/customers/${order.customerId}`);
  redirect(`/dashboard/invoices/${invoiceId}`);
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

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { payments: true },
  });
  if (!invoice) return { error: "الفاتورة غير موجودة" };

  if (input.method === "BALANCE" && !invoice.customerId) {
    return { error: ar.invoices.noCustomerForBalance };
  }

  const total = Number(invoice.total);
  const newPaidAmount = Number(invoice.paidAmount) + input.amount;
  const paymentStatus = computePaymentStatus(total, newPaidAmount);

  const allPayments = [
    ...invoice.payments.map((p) => ({ amount: Number(p.amount), method: p.method as string })),
    { amount: input.amount, method: input.method as string },
  ];
  const newBalanceEffect = computeBalanceEffect(total, allPayments);
  const previousBalanceEffect = Number(invoice.balanceEffectApplied);
  const delta = newBalanceEffect - previousBalanceEffect;

  try {
    await prisma.$transaction(async (tx) => {
      await tx.payment.create({
        data: {
          invoiceId,
          amount: input.amount,
          method: input.method,
          note: input.note || null,
        },
      });
      await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          paidAmount: newPaidAmount,
          paymentStatus,
          balanceEffectApplied: newBalanceEffect,
        },
      });

      if (invoice.customerId) {
        await adjustCustomerBalance(tx, invoice.customerId, delta, {
          reason: balanceEffectReason(delta),
          invoiceId,
          invoiceNumber: invoice.invoiceNumber,
        });
      }
    });
  } catch {
    return { error: "حدث خطأ أثناء تسجيل الدفعة" };
  }

  revalidatePath(`/dashboard/invoices/${invoiceId}`);
  revalidatePath("/dashboard/invoices");
  if (invoice.customerId) {
    revalidatePath(`/dashboard/customers/${invoice.customerId}`);
  }
  return { success: true };
}
