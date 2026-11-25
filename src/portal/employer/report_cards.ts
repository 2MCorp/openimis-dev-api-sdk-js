import type { AccessKey } from "./access";
import type { ReportKind } from "./reports";

/** A downloadable report offered on `/reports` (message keys are resolved by the UI). */
export type ReportCard = {
  kind: Extract<ReportKind, "members" | "contracts" | "payments" | "health-packages">;
  titleKey: string;
  descriptionKey: string;
  access: AccessKey;
  /** Icon hint for the UI layer. */
  icon: "users" | "file-stack" | "receipt" | "package";
};

export const REPORT_CARDS: readonly ReportCard[] = [
  { kind: "members", titleKey: "report_members_title", descriptionKey: "report_members_description", access: "members", icon: "users" },
  { kind: "contracts", titleKey: "report_contracts_title", descriptionKey: "report_contracts_description", access: "contracts", icon: "file-stack" },
  { kind: "payments", titleKey: "report_payments_title", descriptionKey: "report_payments_description", access: "payments", icon: "receipt" },
  { kind: "health-packages", titleKey: "report_packages_title", descriptionKey: "report_packages_description", access: "packages", icon: "package" },
];

/** The report cards the user may download. */
export function availableReportCards(access: Partial<Record<AccessKey, boolean>> | null | undefined): ReportCard[] {
  return REPORT_CARDS.filter((r) => !!access?.[r.access]);
}
