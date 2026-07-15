import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { buildCsv, buildXlsx } from "@/lib/report-export";
import {
  getInventoryReportData,
  getOrdersReportData,
  getCustomersReportData,
} from "@/features/reports/queries";
import { ORDER_STATUS_LABELS } from "@/features/orders/schema";

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
