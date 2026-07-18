import { Card, CardContent } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({
  title,
  value,
  icon: Icon,
  variant = "default",
  formatValue,
}: {
  title: string;
  value: number;
  icon: LucideIcon;
  variant?: "default" | "warning" | "balance";
  formatValue?: (value: number) => string;
}) {
  const isWarning = variant === "warning" && value > 0;
  const isNegativeBalance = variant === "balance" && value < 0;
  const isPositiveBalance = variant === "balance" && value > 0;

  return (
    <Card className="gap-3 transition-shadow hover:shadow-md">
      <CardContent className="flex items-center justify-between gap-3">
        <div className="space-y-1.5">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p
            className={cn(
              "text-3xl font-bold tracking-tight",
              (isWarning || isNegativeBalance) && "text-destructive",
              isPositiveBalance && "text-emerald-600 dark:text-emerald-400",
            )}
          >
            {formatValue ? formatValue(value) : value.toLocaleString("ar")}
          </p>
        </div>
        <div
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-xl",
            isWarning || isNegativeBalance
              ? "bg-destructive/10 text-destructive"
              : isPositiveBalance
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "bg-primary/10 text-primary",
          )}
        >
          <Icon className="size-5" />
        </div>
      </CardContent>
    </Card>
  );
}
