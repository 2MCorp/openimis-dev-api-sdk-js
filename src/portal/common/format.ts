import type { AddressDto } from "./types";

const EM_DASH = "—";

function parseDate(value?: string): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "July 27, 2026" (locale-aware); unparseable input is returned unchanged. */
export function formatDate(dateString?: string, fallback = EM_DASH): string {
  if (!dateString) return fallback;
  const d = parseDate(dateString);
  if (!d) return dateString;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

/** "Jul 27, 2026" (locale-aware); unparseable input is returned unchanged. */
export function formatShortDate(dateString?: string, fallback = EM_DASH): string {
  if (!dateString) return fallback;
  const d = parseDate(dateString);
  if (!d) return dateString;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

/** e.g. date: "Jul 27, 2026", time: "12:56 PM" */
export function formatDateTimeParts(dateString?: string): { date: string; time: string } | null {
  const d = parseDate(dateString);
  if (!d) return null;
  return {
    date: d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }),
    time: d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }),
  };
}

export function formatNumber(value: number | null | undefined, fallback = EM_DASH): string {
  if (value == null || !Number.isFinite(value)) return fallback;
  return value.toLocaleString();
}

/** Plain amount with an optional currency suffix; see `formatConfiguredMoney` for symbols. */
export function formatMoney(
  value: number | null | undefined,
  currency?: string,
  fallback = EM_DASH,
): string {
  if (value == null || !Number.isFinite(value)) return fallback;
  const amount = value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return currency ? `${amount} ${currency}` : amount;
}

/** Ratio (0–1) as a percentage label. */
export function formatRatio(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return EM_DASH;
  return `${(value * 100).toFixed(1)}%`;
}

/** Already-a-percentage (0–100) label. */
export function formatPercent(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return EM_DASH;
  return `${value.toFixed(1)}%`;
}

/** Signed percentage change, e.g. `+12.5%`. */
export function formatDelta(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return EM_DASH;
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

export function formatAddressLine(address?: AddressDto | null): string | undefined {
  if (!address) return undefined;
  const parts = [address.text, address.city, address.district, address.state, address.municipality]
    .map((p) => p?.trim())
    .filter(Boolean);
  return parts.length ? parts.join(", ") : undefined;
}

/** Amount rounded to a whole number (dashboard value tiles); non-numeric input gives the fallback. */
export function formatWholeAmount(
  value: number | string | null | undefined,
  fallback = EM_DASH,
): string {
  const n = typeof value === "number" ? value : Number(value);
  if (value == null || value === "" || !Number.isFinite(n)) return fallback;
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

/** Hours with one decimal, e.g. `3.5h`. */
export function formatHours(value: number | null | undefined, fallback = EM_DASH): string {
  if (value == null || Number.isNaN(value)) return fallback;
  return `${value.toFixed(1)}h`;
}
