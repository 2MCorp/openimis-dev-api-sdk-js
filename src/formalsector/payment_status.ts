/**
 * Payment status as exposed to portals. The backend's `PaymentStatusMapper`
 * (developer_api_fhir/mapping/payment.py) already buckets openIMIS `Payment.status`:
 * -3/-2/-1 → failed, 1–4 → pending, 5 (PaymentMatched) → paid, none → pending.
 */
export type PaymentStatus = "paid" | "pending" | "failed";

export const PAYMENT_STATUSES: readonly PaymentStatus[] = ["paid", "pending", "failed"];

/** openIMIS `Payment.status` codes (payment module). */
export const PAYMENT_STATUS_CODES = {
  rejectedPosted3: -3,
  rejectedPosted2: -2,
  rejectedPosted1: -1,
  notYetConfirmed: 1,
  posted: 2,
  assigned: 3,
  unmatched: 4,
  paymentMatched: 5,
} as const;

/**
 * Normalise a payment status from the FHIR resource (already mapped), a raw numeric
 * code, or a dashboard `by_status` label (e.g. `payment_matched`, `rejected_posted_1`).
 */
export function classifyPaymentStatus(raw: unknown): PaymentStatus {
  const value = String(raw ?? "").trim().toLowerCase();
  if (value === "paid" || value === "5" || value === "payment_matched") return "paid";
  if (value === "failed" || /^-[123]$/.test(value) || value.startsWith("rejected")) {
    return "failed";
  }
  return "pending";
}
