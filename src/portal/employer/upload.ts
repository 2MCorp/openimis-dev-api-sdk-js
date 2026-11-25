import {
  EMPLOYEE_UPLOAD_CONTENT_TYPES,
  EMPLOYEE_UPLOAD_MAX_BYTES,
  EMPLOYEE_UPLOAD_TEMPLATE_CSV,
  employeeUploadContentType,
} from "../../formalsector/employee_ops";

export type EmployeeUploadConfig = {
  extensions: string[];
  maxBytes: number;
  templateCsv: string;
};

/** Upload constraints for the members page — from the SDK so the UI never hard-codes them. */
export function employeeUploadConfig(): EmployeeUploadConfig {
  return {
    extensions: Object.keys(EMPLOYEE_UPLOAD_CONTENT_TYPES),
    maxBytes: EMPLOYEE_UPLOAD_MAX_BYTES,
    templateCsv: EMPLOYEE_UPLOAD_TEMPLATE_CSV,
  };
}

export type UploadFileCheck = { ok: true } | { ok: false; reason: "type" | "size" };

/** Browser-side pre-check of a picked file (the SDK re-checks on upload). */
export function checkUploadFile(file: { name: string; size: number }): UploadFileCheck {
  if (!employeeUploadContentType(file.name)) return { ok: false, reason: "type" };
  if (file.size > EMPLOYEE_UPLOAD_MAX_BYTES) return { ok: false, reason: "size" };
  return { ok: true };
}

/** File name of the downloadable upload template. */
export const UPLOAD_TEMPLATE_FILENAME = "members-upload-template.csv";

/** Comma-separated header row of a template CSV, e.g. `chf_id, plan, income`. */
export function templateColumns(csv: string): string {
  return csv.split(/\r?\n/)[0]?.split(",").join(", ") ?? "";
}

/** Base64 of a file's bytes (no `data:` prefix) — works in browsers and Node. */
export async function fileToBase64(file: { arrayBuffer(): Promise<ArrayBuffer> }): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const chunk = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}
