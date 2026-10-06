export type MiniAppText = {
  dir: "rtl" | "ltr";
  genericError: string;
  errors: Record<string, string>;
  openFromTelegramOnly: string;
  failedToLoadDraft: string;
  invoiceCreatedSuccess: string;
  draftCancelledMessage: string;
  header: string;
  changeButton: string;
  chooseCustomerButton: string;
  customerSearchPlaceholder: string;
  noResults: string;
  ambiguousBadge: string;
  notFoundBadge: string;
  addProductButton: string;
  productSearchPlaceholder: string;
  totalLabel: string;
  paymentTitle: string;
  paidFullButton: string;
  unpaidButton: string;
  partialButton: string;
  amountPlaceholder: string;
  applyButton: string;
  paidLabel: string;
  remainingLabel: string;
  paymentMethods: Record<string, string>;
  paymentStatuses: Record<string, string>;
  confirmButton: string;
  cancelButton: string;
};

export const miniAppText: MiniAppText = {
  dir: "rtl",
  genericError: "حدث خطأ. حاول مرة أخرى.",
  errors: {
    config: "الخدمة غير مهيأة بعد.",
    unauthorized: "تعذّر التحقق من الهوية.",
    not_linked: "حسابك غير مرتبط بهذا البوت.",
    forbidden: "لا تملك صلاحية كافية لهذا الإجراء.",
    not_found: "المسودة غير موجودة أو انتهت صلاحيتها.",
    not_pending: "لم تعد هذه المسودة قابلة للتعديل.",
    no_customer: "اختر عميلاً قبل تأكيد الفاتورة.",
    unresolved_items: "بعض المنتجات تحتاج مراجعة قبل التأكيد.",
    empty: "أضف منتجاً واحداً على الأقل.",
    invalid_input: "بيانات غير صحيحة.",
    item_not_found: "هذا العنصر لم يعد موجوداً.",
    product_not_found: "المنتج غير موجود.",
    customer_not_found: "العميل غير موجود.",
    invalid_candidate: "اختيار غير صالح.",
    invoice_error: "تعذّر إنشاء الفاتورة.",
  },
  openFromTelegramOnly: "افتح هذه الصفحة من داخل تطبيق Telegram.",
  failedToLoadDraft: "تعذّر تحميل المسودة.",
  invoiceCreatedSuccess: "تم إنشاء الفاتورة بنجاح ✅",
  draftCancelledMessage: "تم إلغاء المسودة.",
  header: "🧾 مسودة الفاتورة",
  changeButton: "تغيير",
  chooseCustomerButton: "اختر عميلاً",
  customerSearchPlaceholder: "ابحث بالاسم أو الهاتف",
  noResults: "لا توجد نتائج.",
  ambiguousBadge: "يحتاج اختيار المنتج",
  notFoundBadge: "غير موجود في النظام",
  addProductButton: "+ إضافة منتج",
  productSearchPlaceholder: "ابحث عن منتج",
  totalLabel: "الإجمالي",
  paymentTitle: "الدفع",
  paidFullButton: "مدفوعة بالكامل",
  unpaidButton: "غير مدفوعة",
  partialButton: "دفع جزئي",
  amountPlaceholder: "المبلغ المدفوع",
  applyButton: "تطبيق",
  paidLabel: "المدفوع",
  remainingLabel: "المتبقي",
  paymentMethods: {
    CASH: "نقداً",
    BANK_TRANSFER: "تحويل بنكي",
    CREDIT_CARD: "شيك",
    OTHER: "أخرى",
  },
  paymentStatuses: {
    UNPAID: "غير مدفوع",
    PARTIALLY_PAID: "مدفوع جزئياً",
    PAID: "مدفوع بالكامل",
  },
  confirmButton: "تأكيد وإنشاء الفاتورة",
  cancelButton: "إلغاء",
};

