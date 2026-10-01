import type { PatientModel } from "../models/patient";

/**
 * Browser-ready image src for an insuree photo. OpenIMIS usually returns
 * FHIR Attachment.data (base64); fall back to `photo.url` made absolute against
 * the API root (e.g. `http://host/api`).
 */
export function resolvePatientPhotoSrc(
  patient: Pick<PatientModel, "photoData" | "photoContentType" | "photoUrl">,
  apiBaseUrl: string
): string | undefined {
  const data = patient.photoData?.trim();
  if (data) {
    if (data.startsWith("data:")) return data;
    const mime = patient.photoContentType?.trim() || "image/jpeg";
    return `data:${mime};base64,${data}`;
  }

  const url = patient.photoUrl?.trim();
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url) || url.startsWith("data:")) return url;

  const base = apiBaseUrl.replace(/\/$/, "");
  if (url.startsWith("/")) return `${new URL(base).origin}${url}`;
  return `${base}/${url}`;
}
