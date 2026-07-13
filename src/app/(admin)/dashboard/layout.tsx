import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { auth } from "@/lib/auth";
import { getDashboardStats } from "@/features/dashboard/queries";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, stats] = await Promise.all([auth(), getDashboardStats()]);

  return (
    <SidebarProvider>
      <AppSidebar
        adminName={session?.user?.name ?? ""}
        pendingQuotes={stats.pendingQuoteRequests}
        lowStock={stats.lowStockCount}
      />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-4" />
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
