import type { HfClientConfig } from "../../healthfacility/client_config";
import type { SearchPageDto } from "../common/types";

/** Plain, JSON-serialisable DTOs returned by the HF portal API handlers. */

export type PatientAddressDto = {
  text?: string;
  city?: string;
  district?: string;
  state?: string;
  municipality?: string;
  use?: string;
};

export type PatientContactDto = {
  lastName?: string;
  otherNames?: string;
  fullName?: string;
  relationshipId?: string;
  relationshipDisplay?: string;
  phone?: string;
  email?: string;
  gender?: string;
};

export type PatientDto = {
  id: string;
  chfId: string;
  uuid?: string;
  lastName: string;
  otherNames: string;
  fullName: string;
  birthDate?: string;
  gender?: string;
  phone?: string;
  email?: string;
  /** Browser-ready image src (`data:` URI or absolute URL). */
  photoUrl?: string;
  isHead: boolean;
  cardIssued: boolean;
  familyUuid?: string;
  relationshipDisplay?: string;
  maritalStatus?: string;
  professionDisplay?: string;
  educationDisplay?: string;
  address?: PatientAddressDto | null;
  contacts?: PatientContactDto[];
};

export type ClaimDiagnosisDto = {
  sequence: number;
  code: string;
  display?: string;
};

export type ClaimLineDto = {
  sequence: number;
  code: string;
  category: "item" | "service" | string;
  quantity?: number;
  unitPrice?: number;
  currency?: string;
  reference?: string;
};

export type ClaimListItemDto = {
  id: string;
  code: string;
  uuid?: string;
  status: string;
  patientChfId: string;
  patientName?: string;
  created?: string;
  dateFrom?: string;
  dateTo?: string;
  total?: number;
  currency?: string;
  visitType?: string;
  explanation?: string;
  guaranteeId?: string;
  providerId?: string;
  diagnoses?: ClaimDiagnosisDto[];
  items?: ClaimLineDto[];
};

export type PreauthCodeDto = { code: string; name?: string };

export type PreauthListItemDto = {
  id: string;
  uuid?: string;
  status: string;
  patientChfId: string;
  patientName?: string;
  created?: string;
  hfToId?: string;
  hfToDisplay?: string;
  hfFromId?: string;
  hfFromDisplay?: string;
  primaryDiagnosis?: PreauthCodeDto;
  service?: PreauthCodeDto;
  serviceName?: string;
  itemName?: string;
  explanation?: string;
  rejectionReason?: string;
  /** Linked claim created when this preauth was approved. */
  claimId?: string;
  claimCode?: string;
};

export type CatalogOptionDto = {
  value: string;
  label: string;
  code?: string;
  /** Catalog / pricelist unit price when available (openIMIS price_asked default). */
  unitPrice?: number;
};

/** openIMIS fe-claim claimForm.* flags + money config from HF client-config. */
export type ClientConfigDto = HfClientConfig;
export type ClaimFormClientConfigDto = HfClientConfig["claimForm"];
export type MoneyClientConfigDto = HfClientConfig["money"];

export type BulkPreauthResultDto = {
  message: string;
  created: PreauthListItemDto[];
  errors: { index: number; message: string }[];
};

export type BulkClaimUploadResultDto = {
  message: string;
  totalRows: number;
  successful: number;
  failed: number;
  results: { row: number; success: boolean; message: string; claimId?: string | number }[];
};

export type { SearchPageDto };

export type StaffListItem = {
  id: string;
  username: string;
  displayName: string;
  role: string;
  active: boolean;
  email?: string;
};

export type EnrollmentListItem = {
  uuid: string;
  status: string;
  kind: "registration" | "account_claim";
  summary: string;
  dateCreated?: string;
};

// ---- session ----

export type HfSessionHealthFacility = { id: string; name: string; code: string };

/** Safe user fields kept in the sealed session cookie (never includes the Knox token). */
export type HfSessionUser = {
  id: string;
  username: string;
  email: string;
  lastName: string;
  otherNames: string;
  language: string;
  phone?: string;
  loginName?: string;
  emailVerified: boolean;
  permissions: string[];
  groups: string[];
  healthFacility?: HfSessionHealthFacility;
};

/** Full server session — `accessToken` stays on the server only. */
export type HfSessionData = {
  accessToken: string;
  accessTokenExpires: number;
  user: HfSessionUser;
};

/** What `GET /api/session` returns: everything the app layout needs, minus the Knox token. */
export type HfSessionInfo = {
  user: HfSessionUser;
  clientConfig: ClientConfigDto;
  /** Server session expiry (ms epoch). */
  expiresAt: number;
};
