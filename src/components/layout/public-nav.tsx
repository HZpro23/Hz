"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Store, ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";
import { ar } from "@/i18n/ar";
import { CartBadge } from "@/features/cart/components/cart-badge";

const links = [
  { href: "/", label: ar.publicNav.home },
  { href: "/products", label: ar.publicNav.products },
  { href: "/categories", label: ar.publicNav.categories },
  { href: "/about", label: ar.publicNav.about },
  // { href: "/contact", label: ar.publicNav.contact },
];

export function PublicNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md supports-backdrop-filter:bg-background/60">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" className="flex items-center gap-2.5 font-semibold">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm shadow-primary/30">
            <Store className="size-4.5" />
          </span>
          <span className="tracking-tight">{ar.siteName}</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <div className="hidden items-center gap-1 md:flex">
            {links.map((link) => {
              const isActive =
                link.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "rounded-lg px-3 py-2 font-medium transition-colors",
                    isActive
                      ? "text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
          <Link
            href="/cart"
            className="relative rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            title={ar.publicNav.cart}
          >
            <ShoppingCart className="size-5" />
            <CartBadge />
          </Link>
        </nav>
      </div>
    </header>
  );
}
