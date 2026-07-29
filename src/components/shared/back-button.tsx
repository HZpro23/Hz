"use client";

import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Goes to the actual previous page (browser history) instead of a fixed
 * route, so it lands wherever the admin actually came from — a filtered
 * list page, a different tab, etc. Falls back to `fallbackHref` only when
 * there's no history to go back to (e.g. the page was opened directly). */
export function BackButton({
  fallbackHref,
  label = "رجوع",
  className,
}: {
  fallbackHref: string;
  label?: string;
  className?: string;
}) {
  const router = useRouter();

  function handleClick() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push(fallbackHref);
    }
  }

  return (
    <Button
      variant="outline"
      className={cn("cursor-pointer", className)}
      onClick={handleClick}
    >
      <ArrowRight className="size-4" />
      {label}
    </Button>
  );
}
