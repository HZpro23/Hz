const CURRENCY_LABEL = { ar: "درهم", fr: "DH" } as const;

export function formatCurrency(
  amount: number | string,
  lang: "ar" | "fr" = "ar",
): string {
  const value = typeof amount === "string" ? Number(amount) : amount;
  return `${value.toFixed(2)} ${CURRENCY_LABEL[lang]}`;
}
