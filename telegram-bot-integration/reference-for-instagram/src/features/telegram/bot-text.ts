export type BotText = {
  startNoToken: string;
  startTokenExpired: string;
  startAlreadyLinkedToOther: string;
  startLinkedGreeting: string;
  notLinkedOrForbidden: string;
  voiceTooLarge: string;
  voiceTranscribeFailed: string;
  serviceNotConfigured: string;
  understandFailed: string;
  unknownIntentHelp: string;
  noActiveDraftToConfirm: string;
  noActiveDraftToCancel: string;
  draftCancelled: string;
  noActiveDraftForEdit: string;
  noActiveDraftMessage: string;
  draftHeader: string;
  totalLabel: string;
  customerLabel: string;
  customerNotSet: string;
  paymentStateLabel: string;
  paidLabel: string;
  remainingLabel: string;
  paymentMethodLabel: string;
  needsCustomerNote: string;
  notFoundSuffix: string;
  ambiguousSuffix: string;
  reviewEditButton: string;
  createInvoiceButton: string;
  cancelButtonLabel: string;
  ambiguousPickPromptPrefix: string;
  respeakButton: string;
  editCustomerButton: string;
  addItemsButton: string;
  editItemsButton: string;
  addItemsPrompt: string;
  editCardsHeader: string;
  itemEditButton: string;
  itemDeleteButton: string;
  itemEditPrompt: string;
  itemDeleted: string;
  noItemsToEdit: string;
  itemsNotUnderstood: string;
  itemNotInDraft: string;
  newDraftStarted: string;
  editPaymentButton: string;
  respeakCustomerPrompt: string;
  respeakPaymentPrompt: string;
  paymentMenuPrompt: string;
  payFullButton: string;
  payNoneButton: string;
  payPartialButton: string;
  paymentNotUnderstood: string;
  paymentUpdated: string;
  respeakPrompt: string;
  notFoundPickPromptPrefix: string;
  respeakNotUnderstood: string;
  invoiceCreatedPrefix: string;
  confirmNotPending: string;
  confirmNoCustomer: string;
  confirmUnresolvedItems: string;
  confirmEmpty: string;
  confirmInvoiceErrorFallback: string;
  callbackUnauthorized: string;
  callbackNotFound: string;
  customerSetPrefix: string;
  customerNotFound: string;
  customerAmbiguousPrompt: string;
  /** Contains a literal "{appName}" placeholder — the caller substitutes
   * the business's real name (from SystemSettings/companyConfig). */
  identityReplyTemplate: string;
};

export const botText: BotText = {
  startNoToken:
    "افتح رابط الربط من إعدادات حسابك في لوحة التحكم للاتصال بهذا البوت.",
  startTokenExpired: "انتهت صلاحية رابط الربط. أنشئ رابطاً جديداً.",
  startAlreadyLinkedToOther: "حساب Telegram هذا مرتبط بالفعل بمستخدم آخر.",
  startLinkedGreeting: "تم ربط حسابك بنجاح ✅ أرسل رسالة صوتية أو نصية لإنشاء فاتورة.",
  notLinkedOrForbidden:
    "هذا الحساب غير مرتبط أو لا يملك صلاحية استخدام هذا البوت. اربط حسابك من إعدادات لوحة التحكم.",
  voiceTooLarge: "الرسالة الصوتية كبيرة جداً.",
  voiceTranscribeFailed: "تعذّر تحويل الرسالة الصوتية إلى نص. حاول مرة أخرى.",
  serviceNotConfigured: "الخدمة غير مُهيَّأة بعد. تواصل مع مدير النظام.",
  understandFailed: "تعذّر فهم الطلب. حاول صياغته بشكل مختلف.",
  unknownIntentHelp:
    'لم أفهم الطلب. جرّب مثلاً: "دير ليا جوج صابون وثلاثة شامبو".',
  noActiveDraftToConfirm: "لا توجد مسودة فاتورة نشطة لتأكيدها.",
  noActiveDraftToCancel: "لا توجد مسودة فاتورة نشطة لإلغائها.",
  draftCancelled: "تم إلغاء المسودة.",
  noActiveDraftForEdit:
    'لا توجد مسودة فاتورة نشطة. ابدأ بطلب جديد أولاً، مثلاً: "دير ليا صابون".',
  noActiveDraftMessage: "لا توجد مسودة فاتورة نشطة حالياً.",
  draftHeader: "🧾 مسودة فاتورة",
  totalLabel: "الإجمالي",
  customerLabel: "👤 العميل",
  customerNotSet: "غير محدد",
  paymentStateLabel: "حالة الدفع",
  paidLabel: "المدفوع",
  remainingLabel: "المتبقي",
  paymentMethodLabel: "طريقة الدفع",
  needsCustomerNote: "⚠️ اختر عميلاً من شاشة المراجعة قبل التأكيد.",
  notFoundSuffix: "⚠️ غير موجود في النظام",
  ambiguousSuffix: "⚠️ يحتاج اختيار المنتج",
  reviewEditButton: "✏️ مراجعة وتعديل",
  createInvoiceButton: "✅ إنشاء الفاتورة",
  cancelButtonLabel: "❌ إلغاء",
  ambiguousPickPromptPrefix: "أي منتج تقصد بـ",
  respeakButton: "🎤 أعد نطق الاسم",
  editCustomerButton: "👤 تغيير العميل",
  addItemsButton: "➕ إضافة منتجات",
  editItemsButton: "✏️ تعديل المنتجات",
  addItemsPrompt:
    'قل أو اكتب المنتجات التي تريد إضافتها (مثال: "زيد جوج صابون وثلاثة شامبو") 🎤',
  editCardsHeader: "اختر المنتج الذي تريد تعديله 👇",
  itemEditButton: "✏️ تعديل",
  itemDeleteButton: "🗑 حذف",
  itemEditPrompt:
    "قل أو اكتب التعديل لهذا المنتج: كمية جديدة (مثال: خمسة)، أو اسم منتج آخر، أو «حيد» لحذفه 🎤",
  itemDeleted: "تم حذف المنتج ✅",
  noItemsToEdit: "المسودة فارغة، لا توجد منتجات للتعديل.",
  itemNotInDraft: "لم أجد هذا المنتج في المسودة:",
  newDraftStarted: "لا توجد مسودة مفتوحة، فبدأت مسودة جديدة 🧾",
  itemsNotUnderstood:
    "لم أفهم المنتجات. اضغط الزر وحاول مرة أخرى.",
  editPaymentButton: "💳 تعديل الدفع",
  respeakCustomerPrompt: "قل اسم العميل مرة أخرى (برسالة صوتية أو كتابةً) 🎤",
  respeakPaymentPrompt:
    'قل المبلغ المدفوع (مثال: "200 درهم كاش") 🎤',
  paymentMenuPrompt: "اختر حالة الدفع أو طريقته:",
  payFullButton: "✅ مدفوعة بالكامل",
  payNoneButton: "❌ غير مدفوعة",
  payPartialButton: "🎤 دفع جزئي (قل المبلغ)",
  paymentNotUnderstood:
    "لم أفهم المبلغ. اضغط «تعديل الدفع» وحاول مرة أخرى.",
  paymentUpdated: "تم تحديث الدفع ✅",
  respeakPrompt: "قل اسم المنتج مرة أخرى (برسالة صوتية أو كتابةً) 🎤",
  notFoundPickPromptPrefix: "لم أجد المنتج",
  respeakNotUnderstood: "لم أفهم اسم المنتج. اضغط «أعد نطق الاسم» وحاول مرة أخرى.",
  invoiceCreatedPrefix: "تم إنشاء الفاتورة بنجاح ✅",
  confirmNotPending:
    "هذه المسودة لم تعد قابلة للتأكيد (ربما أُكّدت أو أُلغيت من قبل).",
  confirmNoCustomer: 'اختر عميلاً من شاشة "مراجعة وتعديل" قبل تأكيد الفاتورة.',
  confirmUnresolvedItems:
    "بعض المنتجات تحتاج مراجعة قبل التأكيد — افتح شاشة المراجعة.",
  confirmEmpty: "المسودة فارغة.",
  confirmInvoiceErrorFallback: "تعذّر إنشاء الفاتورة.",
  callbackUnauthorized: "غير مصرح لك.",
  callbackNotFound: "غير موجود.",
  customerSetPrefix: "تم اختيار العميل:",
  customerNotFound: 'لم أجد عميلاً بهذا الاسم. جرّب اسماً آخر أو افتح "مراجعة وتعديل" للبحث.',
  customerAmbiguousPrompt: "اختر العميل المقصود:",
  identityReplyTemplate:
    "أنا مساعد ذكاء اصطناعي في {appName}، أساعد الموظفين على إنشاء الفواتير عبر رسائل صوتية أو نصية.",
};

