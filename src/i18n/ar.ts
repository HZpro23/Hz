export const ar = {
  common: {
    save: "حفظ",
    cancel: "إلغاء",
    delete: "حذف",
    edit: "تعديل",
    add: "إضافة",
    search: "بحث",
    filter: "تصفية",
    status: "الحالة",
    actions: "الإجراءات",
    loading: "جاري التحميل...",
    noResults: "لا توجد نتائج",
    confirmDeleteTitle: "تأكيد الحذف",
    confirmDeleteDescription:
      "هل أنت متأكد من الحذف؟ لا يمكن التراجع عن هذا الإجراء.",
    comingSoon: "هذه الصفحة قيد الإنشاء وستتوفر قريباً",
  },
  siteName: "Hz",
  publicNav: {
    home: "الصفحة الرئيسية",
    products: "المنتجات",
    categories: "الأقسام",
    about: "من نحن",
    contact: "اتصل بنا",
    cart: "السلة",
  },
  admin: {
    dashboard: "لوحة التحكم",
    products: "المنتجات",
    categories: "الأقسام",
    brands: "العلامات التجارية",
    customers: "العملاء",
    orders: "الطلبات",
    inventory: "المخزون",
    suppliers: "الموردون",
    purchases: "المشتريات",
    expenses: "المصروفات",
    reports: "التقارير",
    logout: "تسجيل الخروج",
  },
  dashboardCards: {
    totalProducts: "إجمالي المنتجات",
    totalCustomers: "إجمالي العملاء",
    orders: "الطلبات",
    lowStockProducts: "المنتجات منخفضة المخزون",
  },
  statusLabels: {
    order: {
      PENDING: "قيد الانتظار",
      PROCESSING: "قيد المعالجة",
      COMPLETED: "مكتمل",
      CANCELLED: "ملغي",
    },
    purchaseOrder: {
      PENDING: "قيد الانتظار",
      RECEIVED: "تم الاستلام",
      CANCELLED: "ملغي",
    },
    expenseCategory: {
      RENT: "إيجار",
      SALARIES: "رواتب",
      TRANSPORTATION: "مواصلات",
      UTILITIES: "خدمات (كهرباء وماء)",
      OTHER: "أخرى",
    },
    movementType: {
      IN: "إدخال مخزون",
      OUT: "إخراج مخزون",
      ADJUSTMENT: "تسوية مخزون",
    },
    productStatus: {
      ACTIVE: "نشط",
      INACTIVE: "غير نشط",
    },
  },
} as const;

export function invertLabels(
  labels: Record<string, string>,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(labels).map(([key, label]) => [label, key]),
  );
}
