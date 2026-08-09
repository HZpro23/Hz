// Pinned explicitly so dates render identically whether the code runs on
// the server (print pages, most dashboard pages — UTC on Vercel) or in the
// browser (client components like data tables — the admin's local time).
// Without this, the same timestamp shows a different hour (or even day)
// depending on which side's local timezone was used.
const TIME_ZONE = "Africa/Casablanca";

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("fr-FR", { timeZone: TIME_ZONE });
}

export function formatDateTime(date: Date | string): string {
  return new Date(date).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TIME_ZONE,
  });
}
