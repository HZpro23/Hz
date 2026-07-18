export type PaymentLine = { method: string; amount: number };

export type BalanceConfirmRequest =
  | {
      kind: "insufficient";
      requestedAmount: number;
      availableBalance: number;
      amountNeeded: number;
    }
  | {
      kind: "offer-balance";
      remaining: number;
      availableBalance: number;
    };

/**
 * Looks at a fully-entered set of payment lines against an invoice's total
 * and decides whether the admin must explicitly confirm how رصيد gets used
 * before we proceed — either because a من الرصيد line exceeds what's
 * available, or because there's an unpaid remainder that unused رصيد could
 * cover but nothing in the form has offered to use it yet.
 */
export function checkBalanceConfirmation({
  total,
  customerBalance,
  hasCustomer,
  lines,
}: {
  total: number;
  customerBalance: number;
  hasCustomer: boolean;
  lines: PaymentLine[];
}): BalanceConfirmRequest | null {
  if (!hasCustomer) return null;

  const balanceSum = lines
    .filter((line) => line.method === "BALANCE")
    .reduce((sum, line) => sum + line.amount, 0);
  const paidAmount = lines.reduce((sum, line) => sum + line.amount, 0);

  if (balanceSum > 0.005 && balanceSum > customerBalance + 0.005) {
    return {
      kind: "insufficient",
      requestedAmount: balanceSum,
      availableBalance: customerBalance,
      amountNeeded: balanceSum,
    };
  }

  const remaining = total - paidAmount;
  if (balanceSum < 0.005 && remaining > 0.005 && customerBalance > 0.005) {
    return { kind: "offer-balance", remaining, availableBalance: customerBalance };
  }

  return null;
}

/** Same decision, framed around a single method+amount payment (record-payment dialog). */
export function checkSinglePaymentConfirmation({
  remainingBeforePayment,
  method,
  amount,
  customerBalance,
  hasCustomer,
}: {
  remainingBeforePayment: number;
  method: string;
  amount: number;
  customerBalance: number;
  hasCustomer: boolean;
}): BalanceConfirmRequest | null {
  if (!hasCustomer) return null;

  if (method === "BALANCE") {
    if (amount > customerBalance + 0.005) {
      return {
        kind: "insufficient",
        requestedAmount: amount,
        availableBalance: customerBalance,
        amountNeeded: amount,
      };
    }
    return null;
  }

  const remainingAfter = remainingBeforePayment - amount;
  if (remainingAfter > 0.005 && customerBalance > 0.005) {
    return { kind: "offer-balance", remaining: remainingAfter, availableBalance: customerBalance };
  }
  return null;
}

/** Caps BALANCE-method lines down to `cap`, consuming it in array order. */
export function capBalanceLines<T extends PaymentLine>(lines: T[], cap: number): T[] {
  let remainingCap = cap;
  return lines.map((line) => {
    if (line.method !== "BALANCE") return line;
    const amount = Math.max(0, Math.min(line.amount, remainingCap));
    remainingCap -= amount;
    return { ...line, amount };
  });
}
