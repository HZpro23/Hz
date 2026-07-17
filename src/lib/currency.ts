export const CURRENCY_LABEL = { ar: "درهم", fr: "DH" } as const;

export function formatCurrency(
  amount: number | string,
  lang: "ar" | "fr" = "ar",
  withoutCurrency = false,
): string {
  const value = typeof amount === "string" ? Number(amount) : amount;
  const currencyLabel = CURRENCY_LABEL[lang];
  return withoutCurrency
    ? value.toFixed(2)
    : `${value.toFixed(2)} ${currencyLabel}`;
}
