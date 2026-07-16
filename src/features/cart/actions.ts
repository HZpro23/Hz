"use server";

import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { normalizeArabicName, isFullName } from "@/lib/arabic-name";

const createOrderFromCartSchema = z.object({
  customerName: z
    .string()
    .min(1, "الاسم مطلوب")
    .trim()
    .refine(isFullName, "الرجاء إدخال الاسم الكامل (الاسم واللقب)"),
  customerPhone: z.string().min(8, "رقم الهاتف غير صحيح").trim(),
  customerEmail: z
    .string()
    .email("البريد الإلكتروني غير صحيح")
    .optional()
    .or(z.literal("")),
  items: z
    .array(
      z.object({
        productId: z.string(),
        quantity: z.number().min(1),
      }),
    )
    .min(1, "يجب إضافة منتج واحد على الأقل"),
  notes: z.string().optional(),
});

function generateOrderNumber(): string {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `ORD-${timestamp}-${random}`;
}

export async function createOrderFromCart(
  data: z.infer<typeof createOrderFromCartSchema>,
) {
  try {
    const validatedData = createOrderFromCartSchema.parse(data);

    // Verify all products exist and have sufficient stock
    const products = await prisma.product.findMany({
      where: {
        id: {
          in: validatedData.items.map((item) => item.productId),
        },
      },
    });

    if (products.length !== validatedData.items.length) {
      return {
        success: false,
        error: "أحد المنتجات غير متاح",
      };
    }

    // Check stock for each item
    for (const item of validatedData.items) {
      const product = products.find((p) => p.id === item.productId);
      if (!product || product.quantity < item.quantity) {
        return {
          success: false,
          error: `المنتج "${product?.name}" لا يتوفر بالكمية المطلوبة`,
        };
      }
    }

    // Calculate total
    let total = 0;
    const orderItems = validatedData.items.map((item) => {
      const product = products.find((p) => p.id === item.productId)!;
      const lineTotal = Number(product.price1 || 0) * item.quantity;
      total += lineTotal;
      return {
        productId: item.productId,
        quantity: item.quantity,
        price: product.price1 || 0,
      };
    });

    // Create or find customer — only reuse an existing customer when the
    // (normalized) name is an exact match, to avoid creating duplicates.
    const normalizedName = normalizeArabicName(validatedData.customerName);
    let customer = await prisma.customer.findFirst({
      where: { nameNormalized: normalizedName },
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          name: validatedData.customerName,
          nameNormalized: normalizedName,
          phone: validatedData.customerPhone,
          email: validatedData.customerEmail || null,
        },
      });
    }

    // Create order
    const order = await prisma.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        customerId: customer.id,
        customerName: validatedData.customerName,
        customerPhone: validatedData.customerPhone,
        customerEmail: validatedData.customerEmail || null,
        status: "PENDING",
        total: total.toString(),
        items: {
          create: orderItems,
        },
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        customer: true,
      },
    });

    return {
      success: true,
      orderId: order.id,
      message: "تم إنشاء طلبك بنجاح",
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.issues[0];
      const message = firstError?.message || "بيانات غير صحيحة";
      return {
        success: false,
        error: message,
      };
    }
    return {
      success: false,
      error: "حدث خطأ أثناء إنشاء الطلب",
    };
  }
}
