"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { isUniqueConstraintError } from "@/lib/prisma-errors";
import { brandSchema } from "@/features/brands/schema";

type ActionResult = { error?: string; success?: boolean };

export async function createBrand(input: unknown): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { error: "غير مصرح" };

  const parsed = brandSchema.safeParse(input);
  if (!parsed.success) return { error: "الرجاء التحقق من البيانات المدخلة" };

  try {
    await prisma.brand.create({
      data: {
        name: parsed.data.name,
        slug: parsed.data.slug,
        logoUrl: parsed.data.logoUrl || null,
      },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return { error: "هذا الرابط مستخدم بالفعل لعلامة تجارية أخرى" };
    }
    return { error: "حدث خطأ أثناء إضافة العلامة التجارية" };
  }

  revalidatePath("/dashboard/brands");
  return { success: true };
}

export async function updateBrand(
  id: string,
  input: unknown,
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { error: "غير مصرح" };

  const parsed = brandSchema.safeParse(input);
  if (!parsed.success) return { error: "الرجاء التحقق من البيانات المدخلة" };

  try {
    await prisma.brand.update({
      where: { id },
      data: {
        name: parsed.data.name,
        slug: parsed.data.slug,
        logoUrl: parsed.data.logoUrl || null,
      },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return { error: "هذا الرابط مستخدم بالفعل لعلامة تجارية أخرى" };
    }
    return { error: "حدث خطأ أثناء تحديث العلامة التجارية" };
  }

  revalidatePath("/dashboard/brands");
  return { success: true };
}

export async function deleteBrand(id: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { error: "غير مصرح" };

  try {
    await prisma.brand.delete({ where: { id } });
  } catch {
    return { error: "لا يمكن حذف هذه العلامة التجارية لارتباطها بمنتجات" };
  }

  revalidatePath("/dashboard/brands");
  return { success: true };
}
