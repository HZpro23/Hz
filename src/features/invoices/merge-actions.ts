"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { computePaymentStatus } from "@/lib/money";
import { adjustCustomerBalance, computeBalanceEffect } from "@/features/customers/balance";

type ActionResult = { error?: string; success?: boolean };

export type MergeOldInvoicesInput = {
  sourceInvoiceIds: string[];
  mode: "PRODUCTS" | "PRICE_ONLY";
  cancelOldInvoices: boolean;
};

/**
 * Folds the still-owed remainder of other outstanding invoices for the same
 * customer into this one. In "PRODUCTS" mode the old invoices' line items
 * are copied over (and whatever was already paid on them is carried along
 * as a matching payment, so only the true remainder becomes new debt); in
 * "PRICE_ONLY" mode nothing is itemized — the remainder is added to
 * `mergedDebtAmount`, which the print view surfaces as its own line instead
 * of pretending it's a product. Cancelling an old invoice settles its books
 * with a synthetic payment noting where the balance went, without touching
 * whatever رصيد effect it already applied.
 */
export async function mergeOldInvoicesIntoInvoice(
  invoiceId: string,
  input: MergeOldInvoicesInput,
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { error: "غير مصرح" };

  if (input.sourceInvoiceIds.length === 0) {
    return { error: "الرجاء اختيار فاتورة واحدة على الأقل" };
  }

  const target = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { items: true, payments: true },
  });
  if (!target) return { error: "الفاتورة غير موجودة" };
  if (!target.customerId) {
    return { error: "لا يمكن دمج فواتير قديمة بدون عميل مرتبط بالفاتورة" };
  }

  const sources = await prisma.invoice.findMany({
    where: {
      id: { in: input.sourceInvoiceIds },
      customerId: target.customerId,
      paymentStatus: { in: ["UNPAID", "PARTIALLY_PAID"] },
      NOT: { id: invoiceId },
    },
    include: { items: true },
  });
  if (sources.length === 0) {
    return { error: "لم يتم العثور على فواتير قديمة صالحة للدمج" };
  }

  try {
    await prisma.$transaction(async (tx) => {
      let itemsTotal = target.items.reduce(
        (sum, item) => sum + Number(item.unitPrice) * item.quantity,
        0,
      );
      let mergedDebtAmount = Number(target.mergedDebtAmount);
      let paidAmount = Number(target.paidAmount);
      const carriedPayments: { amount: number; method: string }[] = [];

      for (const source of sources) {
        const sourceTotal = Number(source.total);
        const sourcePaid = Number(source.paidAmount);
        const remaining = Math.max(0, sourceTotal - sourcePaid);
        if (remaining <= 0.005) continue;

        if (input.mode === "PRODUCTS") {
          if (source.items.length > 0) {
            await tx.invoiceItem.createMany({
              data: source.items.map((item) => ({
                invoiceId,
                productId: item.productId,
                name: item.name,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
              })),
            });
          }
          itemsTotal += source.items.reduce(
            (sum, item) => sum + Number(item.unitPrice) * item.quantity,
            0,
          );
          if (sourcePaid > 0.005) {
            await tx.payment.create({
              data: {
                invoiceId,
                amount: sourcePaid,
                method: "OTHER",
                note: `دفعة سابقة محولة من الفاتورة ${source.invoiceNumber}`,
              },
            });
            paidAmount += sourcePaid;
            carriedPayments.push({ amount: sourcePaid, method: "OTHER" });
          }
        } else {
          mergedDebtAmount += remaining;
        }

        if (input.cancelOldInvoices) {
          await tx.payment.create({
            data: {
              invoiceId: source.id,
              amount: remaining,
              method: "OTHER",
              note: `تم ترحيل المبلغ المتبقي إلى الفاتورة ${target.invoiceNumber}`,
            },
          });
          await tx.invoice.update({
            where: { id: source.id },
            data: { paidAmount: sourceTotal, paymentStatus: "PAID" },
          });
        }
      }

      const newTotal = itemsTotal + mergedDebtAmount;
      const newPaymentStatus = computePaymentStatus(newTotal, paidAmount);

      const allPayments = [
        ...target.payments.map((p) => ({
          amount: Number(p.amount),
          method: p.method as string,
        })),
        ...carriedPayments,
      ];
      const newBalanceEffect = computeBalanceEffect(newTotal, allPayments);
      const previousBalanceEffect = Number(target.balanceEffectApplied);
      const delta = newBalanceEffect - previousBalanceEffect;

      await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          total: newTotal,
          paidAmount,
          paymentStatus: newPaymentStatus,
          mergedDebtAmount,
          balanceEffectApplied: newBalanceEffect,
        },
      });

      if (target.customerId) {
        await adjustCustomerBalance(tx, target.customerId, delta, {
          reason: "INVOICE_EDIT",
          invoiceId,
          invoiceNumber: target.invoiceNumber,
        });
      }
    });
  } catch {
    return { error: "حدث خطأ أثناء دمج الفواتير القديمة" };
  }

  revalidatePath(`/dashboard/invoices/${invoiceId}`);
  revalidatePath("/dashboard/invoices");
  revalidatePath(`/dashboard/customers/${target.customerId}`);
  return { success: true };
}
