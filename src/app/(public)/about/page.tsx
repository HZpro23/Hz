import { ar } from "@/i18n/ar";

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-12">
      <h1 className="text-2xl font-semibold">{ar.publicNav.about}</h1>
      <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
        <p>
          {ar.siteName} متخصصون في توفير منتجات عالية الجودة لعملائنا، مع خدمة
          عملاء مميزة وسرعة في الاستجابة لطلبات عروض الأسعار.
        </p>
        <p>
          نحرص على تحديث كتالوج منتجاتنا باستمرار وتقديم أسعار تنافسية تناسب
          احتياجات عملائنا من الأفراد والشركات.
        </p>
      </div>
    </div>
  );
}
