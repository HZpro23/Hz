import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { auth } from "@/lib/auth";
import { ar } from "@/i18n/ar";
import {
  getTelegramAccountsForAdmin,
  resolveBotAdmin,
} from "@/features/telegram/queries";
import { TelegramConnectCard } from "@/features/telegram/components/telegram-connect-card";

export const dynamic = "force-dynamic";

export default async function TelegramSettingsPage() {
  const session = await auth();
  if (!session?.user) notFound();

  const admin = await resolveBotAdmin(session.user.email);
  if (!admin) notFound();
  const accounts = await getTelegramAccountsForAdmin(admin.id);

  return (
    <div className="space-y-6">
      <PageHeader title={ar.admin.telegram} />
      <Card>
        <CardHeader>
          <CardTitle>{ar.admin.telegram}</CardTitle>
        </CardHeader>
        <CardContent>
          <TelegramConnectCard
            accounts={accounts.map((a) => ({
              id: a.id,
              name: a.name,
              username: a.username,
              linkedAt: a.linkedAt.toISOString(),
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
