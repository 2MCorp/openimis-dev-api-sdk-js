/** Cache scope: user + the tenant (facility / employer) so switching never mixes data. */
export function buildScopeKey(
  userId: string | undefined | null,
  tag: string,
  tenantId: string | undefined | null,
): string {
  return `u:${userId ?? "anon"}:${tag}:${tenantId ?? "none"}`;
}

/** HF scope: `u:<id>:hf:<facilityId>`. */
export function hfScopeKey(
  user: { id: string; healthFacility?: { id: string } | null } | null | undefined,
): string {
  return buildScopeKey(user?.id, "hf", user?.healthFacility?.id);
}

/** Employer scope: `u:<id>:ph:<policyHolderCode>`. */
export function employerScopeKey(
  user: { id: string; policyHolder?: { code: string } | null } | null | undefined,
): string {
  return buildScopeKey(user?.id, "ph", user?.policyHolder?.code);
}

export function buildCacheId(scopeKey: string, namespace: string, resourcePath: string): string {
  return `${scopeKey}:${namespace}:${resourcePath}`;
}

export function patientSearchPath(identifier: string): string {
  return `search:${identifier.trim().toLowerCase()}`;
}

export function dashboardPath(months: number, granularity: string): string {
  return `m${months}:g${granularity}`;
}

export function listPath(query = ""): string {
  return query ? `list:${query}` : "list:default";
}

export function detailPath(id: string): string {
  return `detail:${id}`;
}
