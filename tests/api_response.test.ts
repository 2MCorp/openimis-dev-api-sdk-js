import { describe, expect, it } from "vitest";
import { ApiResponse, parseErrorBody } from "../src/api_response";
import HealthFacilityDevAPIClient from "../src/healthfacility/index";
import HttpClient from "../src/types";
import { MockHttpClient } from "./helpers/mockHttpClient";

describe("ApiResponse", () => {
  it("toJSON() emits snake_case keys", () => {
    const response = ApiResponse.ok({ foo: 1 }, 200, "OK", {
      path: "/test",
      method: "GET",
      timestamp: "2024-01-01T00:00:00.000Z",
    });

    expect(response.toJSON()).toEqual({
      success: true,
      message: "OK",
      status_code: "200",
      error_details: [],
      data: { foo: 1 },
      path: "/test",
      method: "GET",
      timestamp: "2024-01-01T00:00:00.000Z",
    });
  });

  describe("parseErrorBody", () => {
    it("extracts detail from DRF error body", () => {
      const { message, errorDetails } = parseErrorBody(
        { detail: "You do not have permission to perform this action." },
        403
      );

      expect(message).toBe("You do not have permission to perform this action.");
      expect(errorDetails).toContain(
        "You do not have permission to perform this action."
      );
    });

    it("falls back to default message for empty body", () => {
      const { message, errorDetails } = parseErrorBody(null, 403);

      expect(message).toBe("Forbidden");
      expect(errorDetails).toEqual([]);
    });
  });
});

describe("MockHttpClient error propagation", () => {
  it("onError returns success:false with statusCode, message, and errorDetails", async () => {
    const http = new MockHttpClient();
    http.onError(
      "GET",
      "/health-facility-dev-api/claims/",
      403,
      "You do not have permission to perform this action.",
      ["You do not have permission to perform this action."]
    );

    const client = new HealthFacilityDevAPIClient(http.asHttpClient());
    const result = await client.claims.list();

    expect(result.success).toBe(false);
    expect(result.statusCode).toBe("403");
    expect(result.message).toBe(
      "You do not have permission to perform this action."
    );
    expect(result.errorDetails).toEqual([
      "You do not have permission to perform this action.",
    ]);
    expect(result.data).toBeNull();
  });
});

describe("HttpClient failure path", () => {
  it("returns ApiResponse.fail with parsed detail for 403 claims.list", async () => {
    const originalFetch = globalThis.fetch;

    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({ detail: "You do not have permission to perform this action." }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        }
      )) as typeof fetch;

    try {
      const http = new HttpClient("https://example.test");
      const client = new HealthFacilityDevAPIClient(http);
      const result = await client.claims.list();

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe("403");
      expect(result.message).toBe(
        "You do not have permission to perform this action."
      );
      expect(result.errorDetails).toContain(
        "You do not have permission to perform this action."
      );
      expect(result.data).toBeNull();
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
