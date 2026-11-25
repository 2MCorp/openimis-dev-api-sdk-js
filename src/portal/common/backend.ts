import type { ApiResponse } from "../../types";

/**
 * Normalised SDK call outcome for form actions and server helpers.
 * Every backend call goes through the SDK — there is no raw fetch fallback.
 */
export type BackendResult<T = unknown> = {
  ok: boolean;
  status: number;
  message: string;
  data: T | null;
  raw: unknown;
};

export function fromApiResponse<T>(resp: ApiResponse<T>): BackendResult<T> {
  return {
    ok: resp.success,
    status: Number(resp.statusCode) || 0,
    message: resp.message,
    data: resp.data,
    raw: resp.data,
  };
}

/** HTTP status safe to send to the browser (falls back when the SDK reports 0). */
export function httpStatus(result: { status: number }, fallback = 400): number {
  return result.status >= 400 && result.status < 600 ? result.status : fallback;
}
