import type { ClaimModel } from "../../models/claim";
import type { PatientModel } from "../../models/patient";
import type { PreauthorizationModel } from "../../models/preauthorization";
import type { FhirSearchPage } from "../../models/pagination";
import { resolvePatientPhotoSrc } from "../../utils/photo";
import { looksLikeUuid } from "./uuid";
import type {
  ClaimListItemDto,
  PatientContactDto,
  PatientDto,
  PreauthListItemDto,
  SearchPageDto,
} from "./types";

function serializePatientContact(c: {
  lastName?: string;
  otherNames?: string;
  relationshipId?: string;
  relationshipDisplay?: string;
  phone?: string;
  email?: string;
  gender?: string;
}): PatientContactDto {
  const fullName = `${c.otherNames ?? ""} ${c.lastName ?? ""}`.trim() || undefined;
  return {
    lastName: c.lastName,
    otherNames: c.otherNames,
    fullName,
    relationshipId: c.relationshipId,
    relationshipDisplay: c.relationshipDisplay,
    phone: c.phone,
    email: c.email,
    gender: c.gender,
  };
}

/**
 * `apiBaseUrl` is the public API root (e.g. `http://host/api`); only used to absolutize a
 * relative `photo.url`.
 */
export function serializePatient(p: PatientModel, apiBaseUrl: string): PatientDto {
  const hasAddress = !!(p.currentAddress || p.city || p.district || p.state || p.municipality);

  return {
    id: p.id,
    chfId: p.chfId,
    uuid: p.uuid,
    lastName: p.lastName,
    otherNames: p.otherNames,
    fullName: p.fullName || `${p.otherNames} ${p.lastName}`.trim(),
    birthDate: p.birthDate,
    gender: p.gender,
    phone: p.phone,
    email: p.email,
    photoUrl: resolvePatientPhotoSrc(p, apiBaseUrl),
    isHead: !!p.isHead,
    cardIssued: !!p.cardIssued,
    familyUuid: p.familyUuid,
    relationshipDisplay: p.relationshipDisplay,
    maritalStatus: p.maritalStatus,
    professionDisplay: p.professionDisplay,
    educationDisplay: p.educationDisplay,
    address: hasAddress
      ? {
          text: p.currentAddress,
          city: p.city,
          district: p.district,
          state: p.state,
          municipality: p.municipality,
          use: p.addressUse,
        }
      : null,
    contacts: (p.contacts ?? []).map(serializePatientContact),
  };
}

export { looksLikeUuid } from "./uuid";

export function serializeClaim(c: ClaimModel): ClaimListItemDto {
  const uuid = c.uuid?.trim() || (looksLikeUuid(c.id) ? c.id.trim() : undefined);
  const id = uuid || c.id;
  return {
    id,
    code: c.code,
    uuid,
    status: String(c.status),
    patientChfId: c.patientChfId,
    patientName: c.patientName,
    created: c.created,
    dateFrom: c.dateFrom,
    dateTo: c.dateTo,
    total: c.total,
    currency: c.currency,
    visitType: c.visitType != null ? String(c.visitType) : undefined,
    explanation: c.explanation,
    guaranteeId: c.guaranteeId,
    providerId: c.providerId,
    diagnoses: (c.diagnoses ?? []).map((d) => ({
      sequence: d.sequence,
      code: d.code,
      display: d.display,
    })),
    items: (c.items ?? []).map((item) => ({
      sequence: item.sequence,
      code: item.code,
      category: item.category,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      currency: item.currency,
      reference: item.reference,
    })),
  };
}

export function serializePreauth(p: PreauthorizationModel): PreauthListItemDto {
  return {
    id: p.id,
    uuid: p.uuid,
    status: String(p.status),
    patientChfId: p.patientChfId,
    patientName: p.patientName,
    created: p.created,
    hfToId: p.hfToId,
    hfToDisplay: p.hfToDisplay,
    hfFromId: p.hfFromId,
    hfFromDisplay: p.hfFromDisplay,
    primaryDiagnosis: p.primaryDiagnosis
      ? { code: p.primaryDiagnosis.code, name: p.primaryDiagnosis.name }
      : undefined,
    service: p.service ? { code: p.service.code, name: p.service.name } : undefined,
    serviceName: p.service?.name ?? p.service?.code,
    itemName: p.item?.name ?? p.item?.code,
    explanation: p.explanation,
    rejectionReason: p.rejectionReason,
    claimId: p.claimId,
    claimCode: p.claimCode,
  };
}

export function serializeSearchPage<T, U>(
  page: FhirSearchPage<T>,
  mapItem: (item: T) => U
): SearchPageDto<U> {
  return {
    total: page.total,
    items: page.items.map(mapItem),
    hasNext: page.hasNext,
    hasPrevious: page.hasPrevious,
  };
}
