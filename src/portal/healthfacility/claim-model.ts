import { ClaimDiagnosisModel, ClaimItemModel, ClaimModel } from "../../models/claim";

export type ClaimLineWrite = {
  code?: string;
  category?: string;
  quantity?: number;
  unitPrice?: number;
  currency?: string;
  reference?: string;
};

export type ClaimDiagnosisWrite = { code?: string; display?: string };

/** JSON body of claim / encounter create + update routes. */
export type ClaimWriteBody = {
  id?: string;
  code?: string;
  uuid?: string;
  status?: string;
  patientChfId?: string;
  providerId?: string;
  visitType?: string;
  /** Claimed/created date — defaults to dateFrom when omitted. */
  created?: string;
  dateFrom?: string;
  dateTo?: string;
  total?: number;
  currency?: string;
  guaranteeId?: string;
  explanation?: string;
  diagnoses?: ClaimDiagnosisWrite[];
  items?: ClaimLineWrite[];
};

export function isClaimWriteBody(value: unknown): value is ClaimWriteBody {
  return !!value && typeof value === "object";
}

export function parseSubmitIds(body: unknown): string[] | null {
  if (!body || typeof body !== "object") return null;
  const idsRaw = (body as { ids?: unknown }).ids;
  if (!Array.isArray(idsRaw) || idsRaw.length === 0) return null;
  const ids = idsRaw.map((id) => String(id ?? "").trim()).filter(Boolean);
  return ids.length > 0 ? [...new Set(ids)] : null;
}

type ClaimGetResult = {
  success: boolean;
  data?: ClaimModel | null;
  statusCode?: string | number;
  message?: string;
};

/**
 * Load full claim models for `$submit`. The backend validates the FHIR Bundle
 * (patient display/identifier cannot be empty), so stub models are not enough.
 */
export async function loadClaimsForSubmit(
  getClaim: (id: string) => Promise<ClaimGetResult>,
  ids: string[]
): Promise<{ claims: ClaimModel[] } | { error: string; status: number }> {
  const claims: ClaimModel[] = [];
  for (const id of ids) {
    const resp = await getClaim(id);
    if (!resp.success || resp.data == null) {
      return { status: Number(resp.statusCode) || 404, error: `Could not load claim ${id} for submit.` };
    }
    const patientChfId = String(resp.data.patientChfId ?? "").trim();
    if (!patientChfId) {
      return {
        status: 400,
        error: `Claim ${resp.data.code || id} is missing a patient CHF ID and cannot be submitted.`,
      };
    }
    claims.push(resp.data);
  }
  return { claims };
}

export function claimModelFromBody(body: ClaimWriteBody): ClaimModel {
  const diagnoses = (body.diagnoses ?? [])
    .map((d, index) => {
      const code = String(d.code ?? "").trim();
      if (!code) return null;
      return new ClaimDiagnosisModel(index + 1, code, d.display?.trim() || undefined);
    })
    .filter((d): d is ClaimDiagnosisModel => d != null);

  const items = (body.items ?? [])
    .map((item, index) => {
      const code = String(item.code ?? "").trim();
      if (!code) return null;
      const category = (item.category ?? "service").trim() || "service";
      return new ClaimItemModel(
        index + 1,
        code,
        category,
        typeof item.quantity === "number" ? item.quantity : Number(item.quantity) || undefined,
        typeof item.unitPrice === "number" ? item.unitPrice : Number(item.unitPrice) || undefined,
        item.currency?.trim() || undefined,
        item.reference?.trim() || undefined
      );
    })
    .filter((item): item is ClaimItemModel => item != null);

  const dateFrom = body.dateFrom?.trim() || undefined;
  const created = body.created?.trim() || dateFrom;

  return new ClaimModel(
    String(body.id ?? body.uuid ?? body.code ?? ""),
    String(body.code ?? body.id ?? ""),
    body.status || "ENTERED",
    String(body.patientChfId ?? "").trim(),
    created,
    body.uuid,
    body.providerId?.trim() || undefined,
    undefined,
    body.visitType?.trim() || undefined,
    dateFrom,
    body.dateTo?.trim() || undefined,
    typeof body.total === "number" ? body.total : undefined,
    body.currency?.trim() || undefined,
    body.guaranteeId?.trim() || undefined,
    body.explanation?.trim() || undefined,
    undefined,
    diagnoses,
    items,
    []
  );
}

export {
  claimPatientLabel,
  claimPatientParts,
  claimRecordId,
  isClaimEditableStatus,
  isClaimSubmittableStatus,
  normalizeClaimPatientName,
  toDateInputValue,
} from "./claim-record";
