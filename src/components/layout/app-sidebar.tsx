"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronsUpDown, LogOut, Store } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { adminNavGroups } from "@/components/layout/admin-nav-items";
import { ar } from "@/i18n/ar";
import { logout } from "@/features/auth/actions";
import { cn } from "@/lib/utils";

export function AppSidebar({
  adminName,
  pendingQuotes,
  lowStock,
}: {
  adminName: string;
  pendingQuotes: number;
  lowStock: number;
}) {
  const pathname = usePathname();
  const badgeValues: Record<string, number> = {
    pendingQuotes,
    lowStock,
  };

  return (
    <Sidebar side="right" collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2.5 px-2 py-1.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground shadow-sm">
            <Store className="size-4.5" />
          </span>
          <span className="truncate font-semibold tracking-tight">
            {ar.siteName}
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent className="gap-1">
        {adminNavGroups.map((group, groupIndex) => (
          <SidebarGroup key={group.label ?? groupIndex}>
            {group.label && (
              <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const isActive =
                    item.href === "/dashboard"
                      ? pathname === "/dashboard"
                      : pathname.startsWith(item.href);
                  const badgeValue = item.badgeKey
                    ? badgeValues[item.badgeKey]
                    : undefined;

                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        isActive={isActive}
                        tooltip={item.label}
                        className={cn(
                          "data-active:bg-primary/10 data-active:text-primary data-active:hover:bg-primary/15 data-active:hover:text-primary",
                        )}
                        render={
                          <Link href={item.href}>
                            <item.icon />
                            <span>{item.label}</span>
                          </Link>
                        }
                      />
                      {!!badgeValue && badgeValue > 0 && (
                        <SidebarMenuBadge
                          className={cn(
                            item.badgeKey === "lowStock"
                              ? "bg-destructive/15 text-destructive"
                              : "bg-primary/15 text-primary",
                          )}
                        >
                          {badgeValue.toLocaleString("ar")}
                        </SidebarMenuBadge>
                      )}
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <SidebarMenuButton
                    size="lg"
                    className="data-popup-open:bg-sidebar-accent data-popup-open:text-sidebar-accent-foreground"
                  >
                    <Avatar className="size-7 rounded-lg">
                      <AvatarFallback className="rounded-lg bg-sidebar-accent text-xs font-medium text-sidebar-accent-foreground">
                        {adminName ? adminName.charAt(0) : "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-1 flex-col overflow-hidden text-start">
                      <span className="truncate text-sm font-medium">
                        {adminName}
                      </span>
                      <span className="truncate text-xs text-sidebar-foreground/60">
                        مدير النظام
                      </span>
                    </div>
                    <ChevronsUpDown className="size-4 text-sidebar-foreground/50" />
                  </SidebarMenuButton>
                }
              />
              <DropdownMenuContent side="top" align="start" className="w-56">
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="text-xs text-muted-foreground">
                    {adminName}
                  </DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <form action={logout}>
                  <DropdownMenuItem
                    variant="destructive"
                    nativeButton
                    render={<button type="submit" className="w-full" />}
                  >
                    <LogOut />
                    {ar.admin.logout}
                  </DropdownMenuItem>
                </form>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
