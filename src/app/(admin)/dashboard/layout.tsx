import { redirect } from "next/navigation";
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

  // Defense in depth: proxy.ts already guards /dashboard/**, but this
  // layout re-checks auth close to the render so any route added under
  // (admin) is protected even if the proxy matcher is ever misconfigured.
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <SidebarProvider>
      <AppSidebar
        adminName={session?.user?.name ?? ""}
        pendingOrders={stats.pendingOrders}
        lowStock={stats.lowStockCount}
        unpaidInvoices={stats.unpaidInvoicesCount}
      />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4 print:hidden">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-4" />
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 print:p-0">
          <div className="w-full lg:mx-auto lg:max-w-350">
            {children}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
