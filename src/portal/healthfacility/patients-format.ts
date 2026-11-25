import { formatAddressLine } from "../common/format";
import type { PatientDto } from "./types";

export { formatAddressLine };

export function patientInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0] ?? "")
    .join("")
    .toUpperCase();
}

/** `/patients/<id>` (+ `?identifier=<chf>`); the UI wraps it with its router's base path. */
export function patientDetailPath(patient: { uuid?: string; chfId?: string; id?: string }): string {
  const id = patient.uuid || patient.chfId || patient.id;
  const base = `/patients/${id}`;
  return patient.chfId ? `${base}?identifier=${encodeURIComponent(patient.chfId)}` : base;
}

export type RecentPatientFields = {
  chfId: string;
  uuid?: string;
  fullName: string;
  gender?: string;
  birthDate?: string;
  photoUrl?: string;
  addressLine?: string;
};

/** Fields stored in the on-device "recent patients" list. */
export function toRecentPatientFields(patient: PatientDto): RecentPatientFields {
  return {
    chfId: patient.chfId,
    uuid: patient.uuid,
    fullName: patient.fullName,
    gender: patient.gender,
    birthDate: patient.birthDate,
    photoUrl: patient.photoUrl,
    addressLine: formatAddressLine(patient.address),
  };
}
