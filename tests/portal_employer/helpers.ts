import type { OpenIMISDevApiSdk } from "../../src/index";

/** Partial SDK stand-in: only the clients a test exercises. */
export function fakeSdk(parts: Record<string, unknown>): OpenIMISDevApiSdk {
  return parts as unknown as OpenIMISDevApiSdk;
}
