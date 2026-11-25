import { looksLikeUuid } from "./uuid";

/** OpenIMIS: rejected=1, entered=2 — both editable. */
export function isClaimEditableStatus(status: string | undefined | null): boolean {
  const key = (status ?? "").trim().toLowerCase();
  return key === "entered" || key === "rejected" || key === "1" || key === "2";
}

/** OpenIMIS STATUS_ENTERED = 2 — only these can be submitted. */
export function isClaimSubmittableStatus(status: string | undefined | null): boolean {
  const key = (status ?? "").trim().toLowerCase();
  return key === "entered" || key === "2";
}

/**
 * Canonical API identifier for claims/encounters.
 * Prefer UUID; avoid bare numeric FHIR/`id` values (often DB pk) when a claim
 * code exists — HF retrieve only supports uuid/code unless DB-id is enabled.
 */
export function claimRecordId(item: { uuid?: string; id?: string; code?: string }): string {
  const uuid = String(item.uuid ?? "").trim();
  if (uuid) return uuid;
  const id = String(item.id ?? "").trim();
  if (looksLikeUuid(id)) return id;
  const code = String(item.code ?? "").trim();
  if (code) return code;
  return id;
}

/** Normalize FHIR/preauth-style "Last/Other" into "Other Last". */
export function normalizeClaimPatientName(raw: string | undefined | null): string {
  const value = (raw ?? "").trim();
  if (!value) return "";
  if (!value.includes("/")) return value;
  return value
    .split("/")
    .map((p) => p.trim())
    .filter(Boolean)
    .reverse()
    .join(" ");
}

/** Parts for list rows: display name + CHF when they differ. */
export function claimPatientParts(item: { patientName?: string; patientChfId?: string }): {
  name: string;
  chf: string;
} {
  const chf = item.patientChfId?.trim() || "";
  const name = normalizeClaimPatientName(item.patientName);
  if (name && chf && name !== chf) return { name, chf };
  if (name && name !== chf) return { name, chf: "" };
  return { name: "", chf: chf || name };
}

/** Format patient for list rows: "Name (CHF)" when both exist and differ. */
export function claimPatientLabel(item: { patientName?: string; patientChfId?: string }): string {
  const { name, chf } = claimPatientParts(item);
  if (name && chf) return `${name} (${chf})`;
  return name || chf || "—";
}

/** `<input type="date">` value (YYYY-MM-DD) from an ISO / date string. */
export function toDateInputValue(value: string | undefined | null): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value.slice(0, 10);
  return d.toISOString().slice(0, 10);
}
