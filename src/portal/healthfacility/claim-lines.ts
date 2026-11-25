import type { ClaimLineDto } from "./types";

export function isItemLineCategory(category: string | undefined | null): boolean {
  const key = (category ?? "").trim().toLowerCase();
  return (
    key === "item" || key === "medication" || key === "medical-item" || key === "medical_item" || key === "m"
  );
}

export function isServiceLineCategory(category: string | undefined | null): boolean {
  if (isItemLineCategory(category)) return false;
  const key = (category ?? "").trim().toLowerCase();
  // Empty/unknown categories default to service (OpenIMIS common case).
  return key === "" || key === "service" || key === "s";
}

export function splitClaimLines(lines: ClaimLineDto[] | undefined | null): {
  services: ClaimLineDto[];
  items: ClaimLineDto[];
} {
  const list = lines ?? [];
  return {
    services: list.filter((line) => isServiceLineCategory(line.category)),
    items: list.filter((line) => isItemLineCategory(line.category)),
  };
}

export function formatLineMoney(value: number | undefined | null, currency?: string | null): string {
  if (value == null || Number.isNaN(value)) return "—";
  const amount = value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  if (!currency) return amount;
  // Prefer configured symbol-style currency when it looks like a symbol (e.g. ₦).
  const trimmed = currency.trim();
  if (trimmed.length <= 2 || /[^\w]/.test(trimmed)) return `${trimmed}${amount}`;
  return `${amount} ${trimmed}`;
}

export function lineTotal(
  quantity: number | undefined | null,
  unitPrice: number | undefined | null
): number | null {
  if (quantity == null || unitPrice == null) return null;
  if (Number.isNaN(quantity) || Number.isNaN(unitPrice)) return null;
  return quantity * unitPrice;
}
