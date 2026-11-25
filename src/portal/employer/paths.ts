/** App-relative paths of the employer portal (framework-agnostic; no base path or locale). */
export const employerPaths = {
  dashboard: "/",
  login: "/login",
  enrollment: "/enrollment",
  enrollmentRegister: "/enrollment/register",
  enrollmentClaim: "/enrollment/claim",
  register: "/register",
  forgotPassword: "/forgot-password",
  members: "/members",
  member: (id: string) => `/members/${encodeURIComponent(id)}`,
  memberClaim: (memberId: string, claimId: string) =>
    `/members/${encodeURIComponent(memberId)}/claims/${encodeURIComponent(claimId)}`,
  contracts: "/contracts",
  contract: (id: string) => `/contracts/${encodeURIComponent(id)}`,
  healthPackages: "/health-packages",
  healthPackage: (id: string) => `/health-packages/${encodeURIComponent(id)}`,
  payments: "/payments",
  paymentReturn: "/payments/return",
  staffs: "/staffs",
  staff: (id: string) => `/staffs/${encodeURIComponent(id)}`,
  verifyEmail: (email?: string) =>
    email ? `/verify-email?email=${encodeURIComponent(email)}` : "/verify-email",
} as const;

/** Prefix an app-relative path (optionally with a query string) with a base path. */
export function withBase(base: string, path: string): string {
  return `${base.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}
