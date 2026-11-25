import type { PaymentStatusKey } from "./dto";

/**
 * Label *keys*: the SDK knows which message a status/code maps to; the UI looks the
 * key up in its own i18n catalogue (paraglide / next-intl / ...). The keys are the
 * message names used by the portal's translation files.
 */

export type PaymentStatusMessageKey =
  | "payment_status_paid"
  | "payment_status_failed"
  | "payment_status_pending";

/** Message key for the SDK payment buckets (paid / pending / failed). */
export function paymentStatusMessageKey(key: PaymentStatusKey): PaymentStatusMessageKey {
  switch (key) {
    case "paid":
      return "payment_status_paid";
    case "failed":
      return "payment_status_failed";
    default:
      return "payment_status_pending";
  }
}

export type VisitTypeMessageKey =
  | "claim_visit_emergency"
  | "claim_visit_referral"
  | "claim_visit_other"
  | "claim_visit_encounter";

/** openIMIS claim visit type codes (ClaimVisitTypeMapping: E, R, O, C) → message key. */
export function visitTypeMessageKey(value: string | undefined): VisitTypeMessageKey | undefined {
  switch ((value ?? "").trim().toUpperCase()) {
    case "E":
      return "claim_visit_emergency";
    case "R":
      return "claim_visit_referral";
    case "O":
      return "claim_visit_other";
    case "C":
      return "claim_visit_encounter";
    default:
      return undefined;
  }
}

/** Raw visit type as display text when no message key applies (`—` when empty). */
export function visitTypeFallback(value: string | undefined): string {
  return value?.trim() || "—";
}

export type StatusTone = "success" | "danger" | "info" | "warning" | "neutral";

/** Colour family for a status badge (contract state, claim status, payment bucket...). */
export function statusTone(status: string | undefined): StatusTone {
  switch ((status ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_")) {
    case "approved":
    case "valuated":
    case "processed":
    case "paid":
    case "effective":
    case "executed":
    case "active":
      return "success";
    case "rejected":
    case "failed":
    case "overdue":
    case "disputed":
    case "terminated":
    case "cancelled":
    case "inactive":
      return "danger";
    case "checked":
    case "executable":
    case "offer":
    case "negotiable":
    case "counter":
    case "addendum":
      return "info";
    case "entered":
    case "pending":
    case "draft":
    case "request_for_information":
      return "warning";
    default:
      return "neutral";
  }
}
