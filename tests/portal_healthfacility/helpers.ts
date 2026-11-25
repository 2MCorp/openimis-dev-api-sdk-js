import OpenIMISDevApiSdk from "../../src/index";
import { MockHttpClient } from "../helpers/mockHttpClient";

export function createMockSdk() {
  const http = new MockHttpClient();
  const sdk = new OpenIMISDevApiSdk(http.asHttpClient());
  return { http, sdk };
}

export const params = (query: Record<string, string> = {}) => new URLSearchParams(query);
