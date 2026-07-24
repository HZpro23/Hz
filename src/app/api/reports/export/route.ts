import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { buildCsv, buildXlsx } from "@/lib/report-export";
import {
  getInventoryReportData,
  getProductsReportData,
  getOrdersReportData,
  getCustomersReportData,
  getPurchasesReportData,
  getSuppliersReportData,
} from "@/features/reports/queries";
import { ORDER_STATUS_LABELS } from "@/features/orders/schema";
import { PURCHASE_ORDER_STATUS_LABELS } from "@/features/purchases/schema";

type ReportPayload = { headers: string[]; rows: (string | number)[][] };

const REPORT_BUILDERS: Record<string, () => Promise<ReportPayload>> = {
  inventory: async () => {
    const products = await getInventoryReportData();
    return {
      headers: [
        "اسم المنتج",
        "SKU",
        "القسم",
        "العلامة التجارية",
        "الكمية",
        "الحد الأدنى",
        "الحالة",
      ],
      rows: products.map((product) => [
        product.name,
        product.sku,
        product.category.name,
        product.brand?.name ?? "",
        product.quantity,
        product.minStockLevel,
        product.status === "ACTIVE" ? "نشط" : "غير نشط",
      ]),
    };
  },
  products: async () => {
    const products = await getProductsReportData();
    return {
      headers: [
        "اسم المنتج",
        "SKU",
        "الرابط",
        "القسم",
        "العلامة التجارية",
        "الكمية",
        "الحد الأدنى",
        "السعر الأول",
        "السعر الثاني",
        "السعر الثالث",
        "الباركود",
        "الوصف",
        "الحالة",
        "الصور",
      ],
      rows: products.map((product) => [
        product.name,
        product.sku,
        product.slug,
        product.category.name,
        product.brand?.name ?? "",
        product.quantity,
        product.minStockLevel,
        Number(product.price1),
        Number(product.price2),
        Number(product.price3),
        product.barcode ?? "",
        product.description ?? "",
        product.status === "ACTIVE" ? "نشط" : "غير نشط",
        product.images.map((image) => image.secureUrl).join(", "),
      ]),
    };
  },
  orders: async () => {
    const orders = await getOrdersReportData();
    return {
      headers: [
        "رقم الطلب",
        "العميل",
        "الهاتف",
        "الإجمالي (درهم)",
        "الحالة",
        "التاريخ",
      ],
      rows: orders.map((order) => [
        order.orderNumber,
        order.customerName,
        order.customerPhone,
        Number(order.total),
        ORDER_STATUS_LABELS[order.status] ?? order.status,
        order.createdAt.toISOString().slice(0, 10),
      ]),
    };
  },
  customers: async () => {
    const customers = await getCustomersReportData();
    return {
      headers: [
        "الاسم",
        "الهاتف",
        "البريد الإلكتروني",
        "عدد الطلبات",
        "إجمالي المشتريات (درهم)",
      ],
      rows: customers.map((customer) => [
        customer.name,
        customer.phone,
        customer.email ?? "",
        customer.ordersCount,
        customer.totalSpent,
      ]),
    };
  },
  purchases: async () => {
    const purchases = await getPurchasesReportData();
    return {
      headers: [
        "رقم أمر الشراء",
        "المورد",
        "الحالة",
        "الإجمالي (درهم)",
        "تاريخ الإنشاء",
        "تاريخ الاستلام",
      ],
      rows: purchases.map((order) => [
        order.orderNumber,
        order.supplier.name,
        PURCHASE_ORDER_STATUS_LABELS[order.status] ?? order.status,
        Number(order.total),
        order.createdAt.toISOString().slice(0, 10),
        order.receivedAt ? order.receivedAt.toISOString().slice(0, 10) : "",
      ]),
    };
  },
  suppliers: async () => {
    const suppliers = await getSuppliersReportData();
    return {
      headers: [
        "الاسم",
        "الهاتف",
        "البريد الإلكتروني",
        "العنوان",
        "عدد أوامر الشراء",
        "إجمالي المشتريات منه (درهم)",
      ],
      rows: suppliers.map((supplier) => [
        supplier.name,
        supplier.phone ?? "",
        supplier.email ?? "",
        supplier.address ?? "",
        supplier.ordersCount,
        supplier.totalPurchased,
      ]),
    };
  },
};

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const type = searchParams.get("type") ?? "";
  const format = searchParams.get("format") ?? "csv";

  const builder = REPORT_BUILDERS[type];
  if (!builder) {
    return NextResponse.json({ error: "نوع تقرير غير صحيح" }, { status: 400 });
  }

  const { headers, rows } = await builder();

  if (format === "xlsx") {
    const buffer = await buildXlsx(type, headers, rows);
    return new NextResponse(Buffer.from(buffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${type}.xlsx"`,
      },
    });
  }

  const csv = buildCsv(headers, rows);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${type}.csv"`,
    },
  });
}
