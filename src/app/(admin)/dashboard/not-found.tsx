import Link from "next/link";
import { Home, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-24 text-center">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-muted">
        <SearchX className="size-8 text-muted-foreground" />
      </div>
      <div className="space-y-2">
        <p className="text-6xl font-bold tracking-tight">404</p>
        <h1 className="text-xl font-semibold">الصفحة غير موجودة</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          عذراً، الصفحة التي تبحث عنها غير موجودة أو تم نقلها أو حذفها.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button nativeButton={false} render={<Link href="/dashboard" />}>
          <Home className="size-4" />
          العودة إلى الرئيسية
        </Button>
      </div>
    </div>
  );
}
