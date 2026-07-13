"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { customerSchema } from "@/features/customers/schema";

type ActionResult = { error?: string; success?: boolean };

export async function createCustomer(input: unknown): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { error: "غير مصرح" };

  const parsed = customerSchema.safeParse(input);
  if (!parsed.success) return { error: "الرجاء التحقق من البيانات المدخلة" };

  await prisma.customer.create({
    data: {
      name: parsed.data.name,
      phone: parsed.data.phone,
      email: parsed.data.email || null,
      address: parsed.data.address || null,
      notes: parsed.data.notes || null,
    },
  });

  revalidatePath("/dashboard/customers");
  return { success: true };
}

export async function updateCustomer(
  id: string,
  input: unknown,
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { error: "غير مصرح" };

  const parsed = customerSchema.safeParse(input);
  if (!parsed.success) return { error: "الرجاء التحقق من البيانات المدخلة" };

  await prisma.customer.update({
    where: { id },
    data: {
      name: parsed.data.name,
      phone: parsed.data.phone,
      email: parsed.data.email || null,
      address: parsed.data.address || null,
      notes: parsed.data.notes || null,
    },
  });

  revalidatePath("/dashboard/customers");
  return { success: true };
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
