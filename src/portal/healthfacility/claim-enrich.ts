import type OpenIMISDevApiSdk from "../../index";
import type { ClaimListItemDto } from "./types";

function needsPatientName(item: ClaimListItemDto): boolean {
  const chf = item.patientChfId?.trim();
  if (!chf) return false;
  const name = item.patientName?.trim();
  return !name || name === chf;
}

function patientDisplayName(fullName: string | undefined, otherNames?: string, lastName?: string): string {
  const fromParts = `${otherNames ?? ""} ${lastName ?? ""}`.trim();
  return (fullName || fromParts).trim();
}

/**
 * FHIR claim `patient.display` historically was CHF-only. When name is missing
 * (or equal to CHF), resolve it via search-patient for the page's unique CHF IDs.
 */
export async function enrichClaimsWithPatientNames(
  sdk: OpenIMISDevApiSdk,
  claims: ClaimListItemDto[]
): Promise<ClaimListItemDto[]> {
  const chfIds = [
    ...new Set(
      claims
        .filter(needsPatientName)
        .map((c) => c.patientChfId.trim())
        .filter(Boolean)
    ),
  ];
  if (chfIds.length === 0) return claims;

  const nameByChf = new Map<string, string>();
  await Promise.all(
    chfIds.map(async (chf) => {
      try {
        const resp = await sdk.healthFacility.patients.getByChfId(chf);
        if (!resp.success || resp.data == null) return;
        const name = patientDisplayName(resp.data.fullName, resp.data.otherNames, resp.data.lastName);
        if (name) nameByChf.set(chf, name);
      } catch {
        // Leave row as CHF-only if lookup fails.
      }
    })
  );

  if (nameByChf.size === 0) return claims;

  return claims.map((claim) => {
    const chf = claim.patientChfId?.trim();
    if (!chf || !needsPatientName(claim)) return claim;
    const resolved = nameByChf.get(chf);
    if (!resolved) return claim;
    return { ...claim, patientName: resolved };
  });
}
