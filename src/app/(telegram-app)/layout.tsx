/**
 * Isolated shell for the Telegram Mini App — no dashboard chrome. Runs inside
 * Telegram's own WebView (no dashboard cookies), so it authenticates purely
 * via `initData` (see `src/lib/telegram-init-data.ts`). Arabic-only / RTL.
 * The Telegram WebApp script is loaded by the Mini App component itself.
 */
export default function TelegramAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div dir="rtl" lang="ar" className="min-h-screen bg-muted/30">
      <div className="mx-auto max-w-md min-h-screen bg-background">{children}</div>
    </div>
  );
}
