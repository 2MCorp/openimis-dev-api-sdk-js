import type { HealthPackageDto } from "./dto";

/**
 * Packages are loaded in one call, so the list page searches in the browser: match the query
 * (case-insensitive substring) against the package name, bundle code and each plan's name/code.
 * An empty query returns every package.
 */
export function filterHealthPackages(
  packages: readonly HealthPackageDto[],
  query: string,
): HealthPackageDto[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...packages];
  return packages.filter((p) =>
    [p.name, p.bundleCode, ...p.plans.flatMap((plan) => [plan.name, plan.code])]
      .filter(Boolean)
      .some((value) => value!.toLowerCase().includes(q)),
  );
}

/** Whether an API error message (as shown by the SWR state) means "resource not found". */
export function isNotFoundMessage(message: string | null | undefined): boolean {
  return Boolean(message && /not found/i.test(message));
}
