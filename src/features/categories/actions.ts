"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { isUniqueConstraintError } from "@/lib/prisma-errors";
import { categorySchema } from "@/features/categories/schema";

type ActionResult = { error?: string; success?: boolean };

export async function createCategory(input: unknown): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { error: "غير مصرح" };

  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) return { error: "الرجاء التحقق من البيانات المدخلة" };

  try {
    await prisma.category.create({
      data: {
        name: parsed.data.name,
        slug: parsed.data.slug,
        parentId: parsed.data.parentId || null,
        imagePublicId: parsed.data.image?.publicId ?? null,
        imageSecureUrl: parsed.data.image?.secureUrl ?? null,
      },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return { error: "هذا الرابط مستخدم بالفعل لقسم آخر" };
    }
    return { error: "حدث خطأ أثناء إضافة القسم" };
  }

  revalidatePath("/dashboard/categories");
  revalidatePath("/categories");
  revalidatePath("/");
  return { success: true };
}

export async function updateCategory(
  id: string,
  input: unknown,
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { error: "غير مصرح" };

  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) return { error: "الرجاء التحقق من البيانات المدخلة" };

  if (parsed.data.parentId === id) {
    return { error: "لا يمكن اختيار القسم نفسه كقسم أب" };
  }

  try {
    await prisma.category.update({
      where: { id },
      data: {
        name: parsed.data.name,
        slug: parsed.data.slug,
        parentId: parsed.data.parentId || null,
        imagePublicId: parsed.data.image?.publicId ?? null,
        imageSecureUrl: parsed.data.image?.secureUrl ?? null,
      },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return { error: "هذا الرابط مستخدم بالفعل لقسم آخر" };
    }
    return { error: "حدث خطأ أثناء تحديث القسم" };
  }

  revalidatePath("/dashboard/categories");
  revalidatePath("/categories");
  revalidatePath("/");
  return { success: true };
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { error: "غير مصرح" };

  try {
    await prisma.category.delete({ where: { id } });
  } catch {
    return {
      error: "لا يمكن حذف هذا القسم لارتباطه بمنتجات أو أقسام فرعية",
    };
  }

  revalidatePath("/dashboard/categories");
  return { success: true };
}

export async function deleteCategories(ids: string[]): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { error: "غير مصرح" };
  if (ids.length === 0) return { success: true };

  let failedCount = 0;
  for (const id of ids) {
    try {
      await prisma.category.delete({ where: { id } });
    } catch {
      failedCount++;
    }
  }

  revalidatePath("/dashboard/categories");

  if (failedCount > 0) {
    return {
      error: `تعذر حذف ${failedCount} من الأقسام لارتباطها بمنتجات أو أقسام فرعية`,
    };
  }
  return { success: true };
}
