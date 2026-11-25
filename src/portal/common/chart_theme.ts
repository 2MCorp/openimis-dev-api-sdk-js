/** Series colours shared by both portals' dashboards (framework-free data only). */
export const chartColors = {
  claims: "oklch(0.48 0.09 230)",
  encounters: "oklch(0.5 0.09 175)",
  rejected: "oklch(0.55 0.14 25)",
  entered: "oklch(0.62 0.1 85)",
  checked: "oklch(0.55 0.06 250)",
  valuated: "oklch(0.45 0.08 150)",
  approved: "oklch(0.5 0.1 145)",
  grid: "oklch(0.9 0.01 240)",
  axis: "oklch(0.55 0.02 250)",
  muted: "oklch(0.65 0.02 250)",
} as const;

/** Employer-portal series colours (same palette family as the HF portal). */
export const employerColors = {
  enrolled: chartColors.encounters,
  churned: chartColors.rejected,
  claims: chartColors.claims,
  received: chartColors.approved,
  premiums: chartColors.checked,
} as const;
