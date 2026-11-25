/** HF notification deep links (the subset of the UI store item the helpers read). */

export type HfNotificationLike = {
  entity?: string;
  claimId?: string;
  claimCode?: string;
  preauthorizationId?: string;
  patientName?: string;
  patientChfId?: string;
  visitType?: string;
  status?: string;
  message?: string;
};

export type NotificationHref =
  | `/claims/${string}`
  | `/encounters/${string}`
  | `/pre_authorizations/${string}`
  | "/pre_authorizations"
  | null;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function looksLikeAnyUuid(value: string | undefined | null): boolean {
  return !!value && UUID_RE.test(value.trim());
}

function looksLikePreauthorization(item: HfNotificationLike): boolean {
  if (item.entity === "preauthorization") return true;
  if (item.preauthorizationId) return true;
  const msg = item.message?.toLowerCase() ?? "";
  return msg.includes("pre-authorization") || msg.includes("preauthorization");
}

function isApprovedPreauthorization(item: HfNotificationLike): boolean {
  if (!looksLikePreauthorization(item)) return false;
  if (item.status?.toUpperCase() === "A") return true;
  return (item.message?.toLowerCase() ?? "").includes("approved");
}

function claimHref(item: HfNotificationLike & { claimId: string }): NotificationHref {
  return item.visitType === "C" ? `/encounters/${item.claimId}` : `/claims/${item.claimId}`;
}

/** Resolve the best in-app route for a notification item. */
export function notificationHref(item: HfNotificationLike): NotificationHref {
  // Approved preauth → open the claim that was created from it.
  if (isApprovedPreauthorization(item) && item.claimId) {
    return claimHref({ ...item, claimId: item.claimId });
  }
  if (looksLikePreauthorization(item)) {
    return item.preauthorizationId ? `/pre_authorizations/${item.preauthorizationId}` : "/pre_authorizations";
  }
  if (!item.claimId) return null;
  return claimHref({ ...item, claimId: item.claimId });
}

/**
 * Human-readable secondary line for toasts / bell / OS notifications.
 * Prefer patient name + claim/encounter code — never raw UUIDs.
 * Examples: `Aisha Bello · CLM-1024`, `Aisha Bello (CHF123)`, `CLM-1024`.
 */
export function notificationSecondaryLabel(item: HfNotificationLike): string | null {
  const name = item.patientName?.trim() || null;
  const chf =
    item.patientChfId?.trim() && !looksLikeAnyUuid(item.patientChfId) ? item.patientChfId.trim() : null;
  const person = name ? (chf && chf !== name ? `${name} (${chf})` : name) : chf;

  const code = item.claimCode?.trim();
  const safeCode = code && !looksLikeAnyUuid(code) ? code : null;

  if (person && safeCode) return `${person} · ${safeCode}`;
  if (person) return person;
  if (safeCode) return safeCode;

  const claimId = item.claimId?.trim();
  if (claimId && !looksLikeAnyUuid(claimId)) return `#${claimId}`;
  return null;
}
