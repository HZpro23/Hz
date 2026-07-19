"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { customerSchema } from "@/features/customers/schema";
import { normalizeArabicName } from "@/lib/arabic-name";
import { findCustomerByPhone } from "@/features/customers/queries";
import { adjustCustomerBalance } from "@/features/customers/balance";

type ActionResult = { error?: string; success?: boolean };
type CreateCustomerResult = ActionResult & { customerId?: string };

export async function createCustomer(
  input: unknown,
): Promise<CreateCustomerResult> {
  const session = await auth();
  if (!session?.user) return { error: "غير مصرح" };

  const parsed = customerSchema.safeParse(input);
  if (!parsed.success) return { error: "الرجاء التحقق من البيانات المدخلة" };

  const existing = await prisma.customer.findFirst({
    where: { phone: parsed.data.phone },
    select: { id: true },
  });
  if (existing) {
    return { error: "يوجد عميل مسجل بنفس رقم الهاتف بالفعل" };
  }

  const customer = await prisma.customer.create({
    data: {
      name: parsed.data.name,
      nameNormalized: normalizeArabicName(parsed.data.name),
      phone: parsed.data.phone,
      email: parsed.data.email || null,
      address: parsed.data.address || null,
      notes: parsed.data.notes || null,
    },
  });

  revalidatePath("/dashboard/customers");
  return { success: true, customerId: customer.id };
}

export async function updateCustomer(
  id: string,
  input: unknown,
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { error: "غير مصرح" };

  const parsed = customerSchema.safeParse(input);
  if (!parsed.success) return { error: "الرجاء التحقق من البيانات المدخلة" };

  const existing = await prisma.customer.findFirst({
    where: { phone: parsed.data.phone, id: { not: id } },
    select: { id: true },
  });
  if (existing) {
    return { error: "يوجد عميل مسجل بنفس رقم الهاتف بالفعل" };
  }

  await prisma.customer.update({
    where: { id },
    data: {
      name: parsed.data.name,
      nameNormalized: normalizeArabicName(parsed.data.name),
      phone: parsed.data.phone,
      email: parsed.data.email || null,
      address: parsed.data.address || null,
      notes: parsed.data.notes || null,
    },
  });

  revalidatePath("/dashboard/customers");
  revalidatePath(`/dashboard/customers/${id}`);
  return { success: true };
}

export async function adjustCustomerBalanceManual(
  customerId: string,
  input: { delta: number; note?: string },
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { error: "غير مصرح" };

  if (!Number.isFinite(input.delta) || Math.abs(input.delta) < 0.005) {
    return { error: "الرجاء إدخال مبلغ صحيح" };
  }

  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) return { error: "العميل غير موجود" };

  await prisma.$transaction(async (tx) => {
    await adjustCustomerBalance(tx, customerId, input.delta, {
      reason: "MANUAL_ADJUSTMENT",
      note: input.note,
    });
  });

  revalidatePath(`/dashboard/customers/${customerId}`);
  revalidatePath("/dashboard/customers");
  return { success: true };
}

export async function findCustomerByPhoneAction(
  phone: string,
  excludeId?: string,
) {
  const session = await auth();
  if (!session?.user) return [];
  if (phone.trim().length < 6) return [];
  return findCustomerByPhone(phone, excludeId);
}

export async function deleteCustomer(id: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { error: "غير مصرح" };

  try {
    await prisma.customer.delete({ where: { id } });
  } catch {
    return { error: "لا يمكن حذف هذا العميل لارتباطه بطلبات سابقة" };
  }

  revalidatePath("/dashboard/customers");
  return { success: true };
}

export async function deleteCustomers(ids: string[]): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { error: "غير مصرح" };
  if (ids.length === 0) return { success: true };

  let failedCount = 0;
  for (const id of ids) {
    try {
      await prisma.customer.delete({ where: { id } });
    } catch {
      failedCount++;
    }
  }

  revalidatePath("/dashboard/customers");

  if (failedCount > 0) {
    return {
      error: `تعذر حذف ${failedCount} من العملاء لارتباطهم بطلبات سابقة`,
    };
  }
  return { success: true };
}
