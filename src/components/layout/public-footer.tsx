import { Store } from "lucide-react";
import { ar } from "@/i18n/ar";

export function PublicFooter() {
  return (
    <footer className="border-t bg-muted/30">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-4 py-10 text-center">
        <span className="flex items-center gap-2 font-semibold">
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Store className="size-4" />
          </span>
          {ar.siteName}
        </span>
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} {ar.siteName}. جميع الحقوق محفوظة.
        </p>
      </div>
    </footer>
  );
}
