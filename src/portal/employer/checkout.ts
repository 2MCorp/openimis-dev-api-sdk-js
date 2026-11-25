import type { PaymentRedirect } from "../../formalsector/payment_gateway";
import type { PaymentStatusKey } from "./dto";

/** sessionStorage key remembering the transaction across the provider redirect. */
export const PENDING_TX_KEY = "pendingPaymentTx";

/** Return page polls the verified status every `POLL_MS`, at most `MAX_POLLS` times (~2 min). */
export const PAYMENT_POLL_MS = 4000;
export const PAYMENT_MAX_POLLS = 30;

/** The browser landing on the return page proves nothing: only a non-pending status ends polling. */
export function isTerminalPaymentStatus(key: PaymentStatusKey | undefined): boolean {
  return key !== undefined && key !== "pending";
}

export function isWebUrl(url: string): boolean {
  try {
    const { protocol } = new URL(url);
    return protocol === "https:" || protocol === "http:";
  } catch {
    return false;
  }
}

export type CheckoutPlan =
  | { type: "redirect"; url: string }
  | { type: "post"; url: string; fields: { name: string; value: string }[] };

/**
 * How to send the browser to the provider's hosted checkout: a plain navigation or an
 * auto-submitted POST form. `null` when the URL is missing or not http(s).
 */
export function planCheckout(redirect: PaymentRedirect): CheckoutPlan | null {
  if (!redirect.url || !isWebUrl(redirect.url)) return null;
  if (redirect.method === "POST" && redirect.form) {
    return {
      type: "post",
      url: redirect.url,
      fields: Object.entries(redirect.form).map(([name, value]) => ({
        name,
        value: String(value ?? ""),
      })),
    };
  }
  return { type: "redirect", url: redirect.url };
}

/** Where the provider sends the browser back to; the page then polls the real status. */
export function paymentReturnUrl(origin: string): string {
  return `${origin.replace(/\/$/, "")}/payments/return`;
}
