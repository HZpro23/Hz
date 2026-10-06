"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Send, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ar } from "@/i18n/ar";
import {
  generateTelegramLinkToken,
  unlinkTelegramAccount,
} from "@/features/telegram/actions";

export type LinkedTelegramAccount = {
  id: string;
  name: string | null;
  username: string | null;
  linkedAt: string;
};

export function TelegramConnectCard({
  accounts,
}: {
  accounts: LinkedTelegramAccount[];
}) {
  const t = ar;
  const router = useRouter();
  const [deepLink, setDeepLink] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function connect() {
    startTransition(async () => {
      const result = await generateTelegramLinkToken();
      if ("error" in result) {
        toast.error(t.telegram.generateError);
        return;
      }
      setDeepLink(result.deepLink);
    });
  }

  function unlink(accountId: string) {
    startTransition(async () => {
      const result = await unlinkTelegramAccount(accountId);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(t.telegram.unlinkSuccess);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{t.telegram.description}</p>

      {accounts.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {t.telegram.noAccounts}
        </p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {accounts.map((account) => (
            <li
              key={account.id}
              className="flex items-center justify-between gap-3 p-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {account.name || account.username || t.telegram.unnamed}
                </p>
                <p className="truncate text-xs text-muted-foreground" dir="ltr">
                  {account.username ? `@${account.username}` : "—"}
                </p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger
                  render={
                    <Button variant="outline" size="sm" disabled={isPending}>
                      <Trash2 className="size-4" />
                      {t.telegram.unlinkButton}
                    </Button>
                  }
                />
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      {t.telegram.unlinkConfirmTitle}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      {t.telegram.unlinkConfirmDescription}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t.telegram.cancel}</AlertDialogCancel>
                    <AlertDialogAction onClick={() => unlink(account.id)}>
                      {t.telegram.unlinkButton}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </li>
          ))}
        </ul>
      )}

      {deepLink ? (
        <div className="space-y-2">
          <Button
            onClick={() => {
              window.open(deepLink, "_blank", "noopener,noreferrer");
              setDeepLink(null);
              // Refresh shortly after so a freshly linked account shows up.
              setTimeout(() => router.refresh(), 8000);
            }}
          >
            <Send /> {t.telegram.openInTelegram}
          </Button>
          <p className="text-xs text-muted-foreground">
            {t.telegram.linkExpiresNote}
          </p>
        </div>
      ) : (
        <Button onClick={connect} disabled={isPending}>
          {isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : accounts.length > 0 ? (
            t.telegram.addAccountButton
          ) : (
            t.telegram.connectButton
          )}
        </Button>
      )}
    </div>
  );
}
