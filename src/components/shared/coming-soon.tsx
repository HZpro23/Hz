import { Construction } from "lucide-react";
import { ar } from "@/i18n/ar";

export function ComingSoon({ title }: { title: string }) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-24 text-center text-muted-foreground">
        <Construction className="size-8" />
        <p>{ar.common.comingSoon}</p>
      </div>
    </div>
  );
}
