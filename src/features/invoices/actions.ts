"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { invoiceSchema } from "@/features/invoices/schema";
import { getCustomerOutstandingInvoices } from "@/features/invoices/queries";
import { computePaymentStatus } from "@/lib/money";
import { adjustCustomerBalance, computeBalanceEffect } from "@/features/customers/balance";
import { isDeletePasswordValid, DELETE_PASSWORD_ERROR } from "@/lib/delete-guard";
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

/** Client-callable wrapper — invoice creation forms need this to offer
 * distributing an overpayment across a customer's other outstanding
 * invoices before the new invoice even exists yet. */
export async function fetchCustomerOutstandingInvoices(customerId: string) {
  const session = await auth();
  if (!session?.user) return [];
  const invoices = await getCustomerOutstandingInvoices(customerId);
  // Server action return values cross the same serialization boundary as
  // RSC props — Decimal instances aren't plain objects, so they have to be
  // converted here rather than left for the caller to convert after the
  // fact.
  return invoices.map((invoice) => ({
    ...invoice,
    total: Number(invoice.total),
    paidAmount: Number(invoice.paidAmount),
  }));
}

export async function createInvoice(
  input: unknown,
  options?: {
    excessToBalance?: boolean;
    /** Stamped on this invoice's own payment rows so the print page can
     * later find other invoices settled in the same session (e.g. when the
     * overpayment on this new invoice was distributed to older ones via
     * recordPaymentAcrossInvoices under the same batch). */
    batchId?: string;
  },
): Promise<ActionResult> {
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
  // computeBalanceEffect nets a من الرصيد draw against any overpayment past
  // the total. When that nets out positive, it's new credit rather than a
  // draw — only apply that portion if the admin explicitly opted in;
  // otherwise cap it at 0 so paying more than the total never silently
  // grows رصيد on its own.
  const rawBalanceEffect = computeBalanceEffect(total, payments);
  const balanceEffect =
    rawBalanceEffect > 0.005 && !options?.excessToBalance
      ? 0
      : rawBalanceEffect;

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
            create: parsed.data.items.map((item, index) => ({
              productId: item.productId || null,
              name: item.name,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              position: index + 1,
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
            batchId: options?.batchId,
          })),
        });
      }

      await adjustCustomerBalance(tx, customerId, balanceEffect, {
        reason: balanceEffectReason(balanceEffect),
        invoiceId: created.id,
        invoiceNumber: created.invoiceNumber,
      });

      // Sold items leave the shelf the moment the invoice exists — decrement
      // stock and log it the same way order completion does, so the
      // inventory movement history reflects every sale, not just orders.
      for (const item of parsed.data.items) {
        if (!item.productId) continue;
        await tx.product.update({
          where: { id: item.productId },
          data: { quantity: { decrement: item.quantity } },
        });
        await tx.inventoryMovement.create({
          data: {
            productId: item.productId,
            type: "OUT",
            quantity: item.quantity,
            reason: `فاتورة رقم ${created.invoiceNumber}`,
          },
        });
      }

      return created.id;
    });
  } catch {
    return { error: "حدث خطأ أثناء إنشاء الفاتورة" };
  }

  revalidatePath("/dashboard/invoices");
  revalidatePath(`/dashboard/customers/${customerId}`);
  revalidatePath("/dashboard/inventory");
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
    include: { payments: true, items: true },
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

  // Net stock change per product between the old and new item lists — only
  // the difference moves, so raising one line's quantity while another
  // drops doesn't touch products that didn't actually change.
  const oldQtyByProduct = new Map<string, number>();
  for (const item of existing.items) {
    if (!item.productId) continue;
    oldQtyByProduct.set(
      item.productId,
      (oldQtyByProduct.get(item.productId) ?? 0) + item.quantity,
    );
  }
  const newQtyByProduct = new Map<string, number>();
  for (const item of parsed.data.items) {
    if (!item.productId) continue;
    newQtyByProduct.set(
      item.productId,
      (newQtyByProduct.get(item.productId) ?? 0) + item.quantity,
    );
  }
  const changedProductIds = new Set([
    ...oldQtyByProduct.keys(),
    ...newQtyByProduct.keys(),
  ]);

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
            create: parsed.data.items.map((item, index) => ({
              productId: item.productId || null,
              name: item.name,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              position: index + 1,
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

      for (const productId of changedProductIds) {
        const stockDelta =
          (newQtyByProduct.get(productId) ?? 0) -
          (oldQtyByProduct.get(productId) ?? 0);
        if (stockDelta === 0) continue;
        await tx.product.update({
          where: { id: productId },
          data: { quantity: { decrement: stockDelta } },
        });
        await tx.inventoryMovement.create({
          data: {
            productId,
            type: stockDelta > 0 ? "OUT" : "IN",
            quantity: Math.abs(stockDelta),
            reason: `تعديل الفاتورة رقم ${existing.invoiceNumber}`,
          },
        });
      }
    });
  } catch {
    return { error: "حدث خطأ أثناء تحديث الفاتورة" };
  }

  revalidatePath("/dashboard/invoices");
  revalidatePath(`/dashboard/invoices/${id}`);
  revalidatePath("/dashboard/inventory");
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

/** Deleting an invoice always gives back whatever stock it had taken —
 * unlike رصيد reversal, this isn't opt-in, since the items it sold no
 * longer exist in the system's records once the invoice is gone. */
async function restoreInvoiceStockOnDelete(
  tx: Prisma.TransactionClient,
  invoice: {
    invoiceNumber: string;
    items: { productId: string | null; quantity: number }[];
  },
) {
  for (const item of invoice.items) {
    if (!item.productId) continue;
    await tx.product.update({
      where: { id: item.productId },
      data: { quantity: { increment: item.quantity } },
    });
    await tx.inventoryMovement.create({
      data: {
        productId: item.productId,
        type: "IN",
        quantity: item.quantity,
        reason: `حذف الفاتورة رقم ${invoice.invoiceNumber}`,
      },
    });
  }
}

export async function deleteInvoice(
  id: string,
  options?: { applyBalanceChange?: boolean; password?: string },
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { error: "غير مصرح" };
  if (!isDeletePasswordValid(options?.password)) {
    return { error: DELETE_PASSWORD_ERROR };
  }

  const existing = await prisma.invoice.findUnique({
    where: { id },
    include: { items: true },
  });
  if (!existing) return { error: "الفاتورة غير موجودة" };

  try {
    await prisma.$transaction(async (tx) => {
      await reverseInvoiceBalanceOnDelete(tx, existing, options?.applyBalanceChange);
      await restoreInvoiceStockOnDelete(tx, existing);
      await tx.invoice.delete({ where: { id } });
    });
  } catch {
    return { error: "حدث خطأ أثناء حذف الفاتورة، الرجاء المحاولة مرة أخرى" };
  }

  revalidatePath("/dashboard/invoices");
  revalidatePath("/dashboard/inventory");
  if (existing.customerId) revalidatePath(`/dashboard/customers/${existing.customerId}`);
  return { success: true };
}

export async function deleteInvoices(
  decisions: { id: string; applyBalanceChange?: boolean }[],
  password?: string,
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { error: "غير مصرح" };
  if (decisions.length === 0) return { success: true };
  if (!isDeletePasswordValid(password)) return { error: DELETE_PASSWORD_ERROR };

  const decisionById = new Map(decisions.map((d) => [d.id, d.applyBalanceChange]));
  const ids = decisions.map((d) => d.id);

  try {
    await prisma.$transaction(async (tx) => {
      const invoices = await tx.invoice.findMany({
        where: { id: { in: ids } },
        include: { items: true },
      });

      for (const invoice of invoices) {
        await reverseInvoiceBalanceOnDelete(tx, invoice, decisionById.get(invoice.id));
        await restoreInvoiceStockOnDelete(tx, invoice);
      }

      await tx.invoice.deleteMany({ where: { id: { in: ids } } });
    });
  } catch {
    return { error: "حدث خطأ أثناء حذف الفواتير المحددة، الرجاء المحاولة مرة أخرى" };
  }

  revalidatePath("/dashboard/invoices");
  revalidatePath("/dashboard/inventory");
  return { success: true };
}

export async function getOrCreateInvoiceForOrder(
  orderId: string,
  options: {
    language: InvoiceLanguage;
    payments: { method: PaymentMethod; amount: number }[];
    excessToBalance?: boolean;
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
  const rawBalanceEffect = computeBalanceEffect(total, payments);
  const balanceEffect =
    rawBalanceEffect > 0.005 && !options.excessToBalance ? 0 : rawBalanceEffect;

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
            create: order.items.map((item, index) => ({
              productId: item.productId,
              name: item.product.name,
              quantity: item.quantity,
              unitPrice: item.price,
              position: index + 1,
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

/**
 * Records one payment against a customer's outstanding invoices, oldest
 * first, capping the amount given to each invoice at that invoice's own
 * remaining balance — so no single invoice's paidAmount ever exceeds its
 * total and no invoice silently overflows into رصيد on its own. Any money
 * left over after every selected invoice is fully paid is the caller's
 * `excessToBalance` decision: add it to the customer's رصيد as a standalone
 * credit (not tied to any one invoice), or drop it entirely. This replaces
 * the old implicit behavior where paying more than a single invoice's total
 * always became رصيد automatically.
 *
 * This splitting is unchanged by `primaryInvoiceId` below — it only adds an
 * extra audit row (see PaymentTransaction) that records the untouched raw
 * amount the admin actually entered, since the split Payment rows above
 * never show that number on their own (450 becomes 100+200+150 across three
 * rows). Nothing reads PaymentTransaction today, so it can't affect
 * paidAmount, paymentStatus, رصيد, or any existing total.
 */
export async function recordPaymentAcrossInvoices(
  customerId: string,
  input: {
    invoiceIds: string[];
    amount: number;
    method: PaymentMethod;
    note?: string;
    excessToBalance?: boolean;
    /** Lets a BALANCE payment proceed even past the customer's current
     * رصيد (mirrors the existing single-invoice "allow negative" choice). */
    allowNegativeBalance?: boolean;
    /** Reuse an existing batch (e.g. a new invoice's own payments) instead
     * of starting a fresh one — lets two separate action calls still be
     * recognized as "the same payment session" later. */
    batchId?: string;
    /** The invoice the admin was actually paying against (e.g. the invoice
     * page this payment was recorded from), even though the payment may end
     * up spread across others. When given, the full raw amount is logged as
     * one PaymentTransaction row against this invoice — purely an audit
     * record, not used by any invoice/رصيد calculation. Omit to skip it
     * (e.g. the new-invoice excess-distribution call, which has no invoice
     * to attribute to yet). */
    primaryInvoiceId?: string;
  },
): Promise<ActionResult & { batchId?: string }> {
  const session = await auth();
  if (!session?.user) return { error: "غير مصرح" };

  if (!(input.amount > 0)) {
    return { error: "الرجاء إدخال مبلغ صحيح" };
  }
  if (input.invoiceIds.length === 0) {
    return { error: ar.invoices.selectAtLeastOneInvoice };
  }

  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) return { error: "العميل غير موجود" };

  const invoices = await prisma.invoice.findMany({
    where: { id: { in: input.invoiceIds }, customerId },
    include: { payments: true },
    orderBy: { createdAt: "asc" },
  });
  if (invoices.length === 0) return { error: "الفواتير المحددة غير موجودة" };

  if (input.method === "BALANCE" && !input.allowNegativeBalance) {
    const customerBalance = Number(customer.balance);
    if (input.amount > customerBalance + 0.005) {
      return { error: ar.invoices.insufficientBalanceTitle };
    }
  }

  let amountLeft = input.amount;
  const allocations: { invoice: (typeof invoices)[number]; allocated: number }[] =
    [];
  for (const invoice of invoices) {
    if (amountLeft <= 0.005) break;
    const total = Number(invoice.total);
    const invoiceRemaining = Math.max(0, total - Number(invoice.paidAmount));
    if (invoiceRemaining <= 0.005) continue;
    const allocated = Math.min(invoiceRemaining, amountLeft);
    allocations.push({ invoice, allocated });
    amountLeft -= allocated;
  }

  const excess = Math.max(0, amountLeft);
  const batchId = input.batchId ?? crypto.randomUUID();

  try {
    await prisma.$transaction(async (tx) => {
      for (const { invoice, allocated } of allocations) {
        if (allocated <= 0.005) continue;

        const total = Number(invoice.total);
        const newPaidAmount = Number(invoice.paidAmount) + allocated;
        const paymentStatus = computePaymentStatus(total, newPaidAmount);

        const allPayments = [
          ...invoice.payments.map((p) => ({
            amount: Number(p.amount),
            method: p.method as string,
          })),
          { amount: allocated, method: input.method as string },
        ];
        const newBalanceEffect = computeBalanceEffect(total, allPayments);
        const previousBalanceEffect = Number(invoice.balanceEffectApplied);
        const delta = newBalanceEffect - previousBalanceEffect;

        await tx.payment.create({
          data: {
            invoiceId: invoice.id,
            amount: allocated,
            method: input.method,
            note: input.note || null,
            batchId,
          },
        });
        await tx.invoice.update({
          where: { id: invoice.id },
          data: {
            paidAmount: newPaidAmount,
            paymentStatus,
            balanceEffectApplied: newBalanceEffect,
          },
        });
        await adjustCustomerBalance(tx, customerId, delta, {
          reason: balanceEffectReason(delta),
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
        });
      }

      if (excess > 0.005 && input.excessToBalance) {
        await adjustCustomerBalance(tx, customerId, excess, {
          reason: "OVERPAYMENT_CREDIT",
          note: `فائض دفعة موزعة على ${allocations.length} فاتورة`,
        });
      }

      if (input.primaryInvoiceId) {
        await tx.paymentTransaction.create({
          data: {
            customerId,
            invoiceId: input.primaryInvoiceId,
            amount: input.amount,
            method: input.method,
            note: input.note || null,
            batchId,
          },
        });
      }
    });
  } catch {
    return { error: "حدث خطأ أثناء تسجيل الدفعة" };
  }

  revalidatePath("/dashboard/invoices");
  revalidatePath(`/dashboard/customers/${customerId}`);
  for (const { invoice } of allocations) {
    revalidatePath(`/dashboard/invoices/${invoice.id}`);
  }
  return { success: true, batchId };
}

/**
 * Corrects an already-recorded payment's amount/method/note. Recomputes the
 * invoice's paidAmount, paymentStatus, and balanceEffectApplied from scratch
 * against the *other* payments plus this edited one (same derivation
 * recordPayment uses), then applies only the difference from what رصيد
 * previously reflected — exactly the delta-based approach updateInvoice and
 * deleteInvoice already use, so edits/deletes elsewhere keep working off an
 * accurate balanceEffectApplied no matter how many times a payment here is
 * corrected.
 */
export async function updatePayment(
  paymentId: string,
  input: { amount: number; method: PaymentMethod; note?: string },
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { error: "غير مصرح" };

  if (!(input.amount > 0)) {
    return { error: "الرجاء إدخال مبلغ صحيح" };
  }

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { invoice: { include: { payments: true } } },
  });
  if (!payment) return { error: "الدفعة غير موجودة" };

  const invoice = payment.invoice;

  if (input.method === "BALANCE" && !invoice.customerId) {
    return { error: ar.invoices.noCustomerForBalance };
  }

  const total = Number(invoice.total);
  const otherPayments = invoice.payments.filter((p) => p.id !== paymentId);
  const otherPaidAmount = otherPayments.reduce(
    (sum, p) => sum + Number(p.amount),
    0,
  );
  const newPaidAmount = otherPaidAmount + input.amount;
  const paymentStatus = computePaymentStatus(total, newPaidAmount);

  const allPayments = [
    ...otherPayments.map((p) => ({ amount: Number(p.amount), method: p.method as string })),
    { amount: input.amount, method: input.method as string },
  ];
  const newBalanceEffect = computeBalanceEffect(total, allPayments);
  const previousBalanceEffect = Number(invoice.balanceEffectApplied);
  const delta = newBalanceEffect - previousBalanceEffect;

  try {
    await prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: paymentId },
        data: {
          amount: input.amount,
          method: input.method,
          note: input.note || null,
        },
      });
      await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          paidAmount: newPaidAmount,
          paymentStatus,
          balanceEffectApplied: newBalanceEffect,
        },
      });

      if (invoice.customerId) {
        await adjustCustomerBalance(tx, invoice.customerId, delta, {
          reason: "INVOICE_EDIT",
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
        });
      }
    });
  } catch {
    return { error: "حدث خطأ أثناء تعديل الدفعة" };
  }

  revalidatePath(`/dashboard/invoices/${invoice.id}`);
  revalidatePath("/dashboard/invoices");
  if (invoice.customerId) {
    revalidatePath(`/dashboard/customers/${invoice.customerId}`);
  }
  return { success: true };
}

/**
 * Removes a payment entirely. Recomputes the invoice's paidAmount and
 * paymentStatus from the *remaining* payments only (so a fully-refunded
 * invoice correctly falls back to غير مدفوع, including the zero-total edge
 * case computePaymentStatus already guards), and reverses whatever رصيد
 * effect this payment contributed — same delta-against-balanceEffectApplied
 * approach updatePayment uses, just against an empty slot instead of an
 * edited one.
 */
export async function deletePayment(
  paymentId: string,
  password: string,
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { error: "غير مصرح" };
  if (!isDeletePasswordValid(password)) return { error: DELETE_PASSWORD_ERROR };

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { invoice: { include: { payments: true } } },
  });
  if (!payment) return { error: "الدفعة غير موجودة" };

  const invoice = payment.invoice;
  const total = Number(invoice.total);
  const otherPayments = invoice.payments.filter((p) => p.id !== paymentId);
  const newPaidAmount = otherPayments.reduce(
    (sum, p) => sum + Number(p.amount),
    0,
  );
  const paymentStatus = computePaymentStatus(total, newPaidAmount);

  const newBalanceEffect = computeBalanceEffect(
    total,
    otherPayments.map((p) => ({
      amount: Number(p.amount),
      method: p.method as string,
    })),
  );
  const previousBalanceEffect = Number(invoice.balanceEffectApplied);
  const delta = newBalanceEffect - previousBalanceEffect;

  try {
    await prisma.$transaction(async (tx) => {
      await tx.payment.delete({ where: { id: paymentId } });
      await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          paidAmount: newPaidAmount,
          paymentStatus,
          balanceEffectApplied: newBalanceEffect,
        },
      });

      if (invoice.customerId) {
        await adjustCustomerBalance(tx, invoice.customerId, delta, {
          reason: "INVOICE_EDIT",
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
        });
      }
    });
  } catch {
    return { error: "حدث خطأ أثناء حذف الدفعة" };
  }

  revalidatePath(`/dashboard/invoices/${invoice.id}`);
  revalidatePath("/dashboard/invoices");
  if (invoice.customerId) {
    revalidatePath(`/dashboard/customers/${invoice.customerId}`);
  }
  return { success: true };
}

/**
 * Deletes a PaymentTransaction audit row AND reverses everything it paid:
 * every Payment row sharing its batchId (however many invoices
 * recordPaymentAcrossInvoices spread the 450 across), recomputing each
 * affected invoice's paidAmount/paymentStatus/balanceEffectApplied from its
 * *other* payments only — same delta-against-balanceEffectApplied approach
 * deletePayment uses, just for every invoice in the batch instead of one.
 *
 * Known gap: if the original payment had money left over after every
 * selected invoice was fully paid (`excessToBalance`), that leftover was
 * credited to رصيد directly, with no Payment row and no batchId on its
 * CustomerBalanceHistory entry — so it can't be traced back here and won't
 * be reversed. Rare in practice (only happens on a genuine overpayment
 * beyond every invoice in the batch), but worth knowing before relying on
 * this for that case.
 */
export async function deletePaymentTransaction(
  id: string,
  password: string,
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { error: "غير مصرح" };
  if (!isDeletePasswordValid(password)) return { error: DELETE_PASSWORD_ERROR };

  const transaction = await prisma.paymentTransaction.findUnique({
    where: { id },
  });
  if (!transaction) return { error: "هذا السجل غير موجود" };

  const batchId = transaction.batchId;
  const batchPayments = batchId
    ? await prisma.payment.findMany({
        where: { batchId },
        include: { invoice: { include: { payments: true } } },
      })
    : [];

  const affectedInvoiceIds = [
    ...new Set(batchPayments.map((payment) => payment.invoiceId)),
  ];

  try {
    await prisma.$transaction(async (tx) => {
      for (const invoiceId of affectedInvoiceIds) {
        const invoice = batchPayments.find(
          (payment) => payment.invoiceId === invoiceId,
        )!.invoice;
        const total = Number(invoice.total);
        const remainingPayments = invoice.payments.filter(
          (payment) => payment.batchId !== batchId,
        );
        const newPaidAmount = remainingPayments.reduce(
          (sum, payment) => sum + Number(payment.amount),
          0,
        );
        const paymentStatus = computePaymentStatus(total, newPaidAmount);
        const newBalanceEffect = computeBalanceEffect(
          total,
          remainingPayments.map((payment) => ({
            amount: Number(payment.amount),
            method: payment.method as string,
          })),
        );
        const previousBalanceEffect = Number(invoice.balanceEffectApplied);
        const delta = newBalanceEffect - previousBalanceEffect;

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
            reason: "INVOICE_EDIT",
            invoiceId,
            invoiceNumber: invoice.invoiceNumber,
          });
        }
      }

      if (batchId) {
        await tx.payment.deleteMany({ where: { batchId } });
      }
      await tx.paymentTransaction.delete({ where: { id } });
    });
  } catch {
    return { error: "حدث خطأ أثناء حذف السجل وإلغاء الدفعات المرتبطة به" };
  }

  revalidatePath(`/dashboard/invoices/${transaction.invoiceId}`);
  for (const invoiceId of affectedInvoiceIds) {
    revalidatePath(`/dashboard/invoices/${invoiceId}`);
  }
  revalidatePath("/dashboard/invoices");
  revalidatePath(`/dashboard/customers/${transaction.customerId}`);
  return { success: true };
}
