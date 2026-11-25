import type { MoneyClientConfigDto } from "./types";

export const DEFAULT_MONEY_CONFIG: MoneyClientConfigDto = {
  currency: "NGN",
  currencyCode: "NGN",
  currencySymbol: "₦",
  currencySymbolPosition: "left",
  currencyDecimalPlaces: 2,
  currencyName: "Nigerian Naira",
};

export function normalizeMoneyConfig(
  raw: Partial<MoneyClientConfigDto> | null | undefined,
): MoneyClientConfigDto {
  const position = String(
    raw?.currencySymbolPosition ?? DEFAULT_MONEY_CONFIG.currencySymbolPosition,
  ).toLowerCase();
  return {
    currency: String(raw?.currency || DEFAULT_MONEY_CONFIG.currency),
    currencyCode: String(raw?.currencyCode || raw?.currency || DEFAULT_MONEY_CONFIG.currencyCode),
    currencySymbol: String(raw?.currencySymbol || DEFAULT_MONEY_CONFIG.currencySymbol),
    currencySymbolPosition: position === "right" ? "right" : "left",
    currencyDecimalPlaces: Number.isFinite(Number(raw?.currencyDecimalPlaces))
      ? Number(raw?.currencyDecimalPlaces)
      : DEFAULT_MONEY_CONFIG.currencyDecimalPlaces,
    currencyName: String(raw?.currencyName || DEFAULT_MONEY_CONFIG.currencyName),
  };
}

/** Format an amount using the portal money client config (symbol + position). */
export function formatConfiguredMoney(
  value: number | string | undefined | null,
  money: MoneyClientConfigDto | null | undefined = DEFAULT_MONEY_CONFIG,
): string {
  if (value == null || value === "") return "—";
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return "—";

  const cfg = money ?? DEFAULT_MONEY_CONFIG;
  const decimals = cfg.currencyDecimalPlaces ?? 2;
  const amount = n.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  const symbol = cfg.currencySymbol || cfg.currencyCode || "";
  if (!symbol) return amount;
  return cfg.currencySymbolPosition === "right" ? `${amount} ${symbol}` : `${symbol}${amount}`;
}
