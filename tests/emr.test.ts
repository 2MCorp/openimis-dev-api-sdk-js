import { describe, expect, it } from "vitest";
import OpenIMISDevApiSdk from "../src/index";
import { HealthFacilityApiKeyCredentials } from "../src/auth/types";
import EmrDevAPIClient from "../src/emr/index";
import {
  ClaimListFilters,
  EncounterListFilters,
  FhirListParams,
} from "../src/emr/types";
import { ClaimModel } from "../src/models/claim";
import { ClaimChargeItemModel } from "../src/models/claim_charge_item";
import { PreauthorizationModel } from "../src/models/preauthorization";
import HttpClient from "../src/types";
import {
  MockHttpClient,
  searchBundle,
} from "./helpers/mockHttpClient";
import {
  sampleChargeItemDefinitionFhir,
  sampleChargeItemFhir,
  sampleClaimFhir,
  sampleCodeSystemFhir,
  sampleDocumentReferenceFhir,
  sampleLocationFhir,
  sampleMedicationFhir,
  samplePatientFhir,
  samplePreauthFhir,
} from "./fixtures/samples";

function createClient(http = new MockHttpClient()) {
  return {
    http,
    client: new EmrDevAPIClient(http.asHttpClient()),
  };
}

describe("HealthFacilityApiKeyAuthClient", () => {
  it("binds Api-Key + claim-admin onto HttpClient", () => {
    const http = new HttpClient("https://example.test", {
      authScheme: "Token",
    });
    const sdk = new OpenIMISDevApiSdk(http);

    sdk.auth.apiKeyAuth.useApiKey(
      new HealthFacilityApiKeyCredentials("abCdEfGh.secretkey", "CA001")
    );

    expect(http.getAuthScheme()).toBe("Api-Key");
    expect(http.getToken()).toBe("abCdEfGh.secretkey");
    expect(http.getClaimAdminCode()).toBe("CA001");
    expect(sdk.auth.apiKeyAuth.isConfigured()).toBe(true);

    sdk.auth.apiKeyAuth.setClaimAdminCode("CA002");
    expect(http.getClaimAdminCode()).toBe("CA002");

    sdk.auth.apiKeyAuth.clear();
    expect(http.getToken()).toBeUndefined();
    expect(http.getClaimAdminCode()).toBeUndefined();
    expect(sdk.auth.apiKeyAuth.isConfigured()).toBe(false);
  });

  it("sends Authorization Api-Key and X-Claim-Admin-Code headers", async () => {
    const originalFetch = globalThis.fetch;
    let captured: { url?: string; init?: RequestInit } = {};

    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      captured = { url: String(input), init };
      return new Response(JSON.stringify(samplePatientFhir()), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof fetch;

    try {
      const http = new HttpClient("https://example.test");
      http.setAuthScheme("Api-Key");
      http.setToken("prefix.secret");
      http.setClaimAdminCode("CA001");

      const client = new EmrDevAPIClient(http);
      const result = await client.patients.getByChfId("CHF1");
      expect(result.success).toBe(true);

      const headers = captured.init?.headers as Record<string, string>;
      expect(headers.Authorization).toBe("Api-Key prefix.secret");
      expect(headers["X-Claim-Admin-Code"]).toBe("CA001");
      expect(captured.url).toContain("/emr-developer-api/search-patient/");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

describe("EmrDevAPIClient", () => {
  describe("patients + catalogs (Api-Key required, no skipAuth)", () => {
    it("searches patients without skipAuth", async () => {
      const { http, client } = createClient();
      http.on("GET", "/emr-developer-api/search-patient/", samplePatientFhir());

      const result = await client.patients.getByChfId("CHF123456");
      expect(result.success).toBe(true);
      expect(result.data?.chfId).toBe("CHF123456");
      expect(http.lastCall?.options?.skipAuth).toBeUndefined();
      expect(http.lastCall?.path).toContain("identifier=CHF123456");
    });

    it("lists medications/services/diagnoses and facilities under EMR base", async () => {
      const { http, client } = createClient();
      http
        .on(
          "GET",
          "/emr-developer-api/medications/",
          searchBundle("Medication", [sampleMedicationFhir()])
        )
        .on(
          "GET",
          "/emr-developer-api/medications/med-1/",
          sampleMedicationFhir()
        )
        .on(
          "GET",
          "/emr-developer-api/services/",
          searchBundle("ChargeItemDefinition", [
            sampleChargeItemDefinitionFhir(),
          ])
        )
        .on(
          "GET",
          "/emr-developer-api/diagnoses/",
          searchBundle("CodeSystem", [sampleCodeSystemFhir()])
        )
        .on(
          "GET",
          "/emr-developer-api/health-facilities/",
          searchBundle("Location", [sampleLocationFhir()])
        );

      const meds = await client.medications.list(new FhirListParams(0, 5));
      expect(meds.success).toBe(true);
      expect(meds.data?.items[0]?.code).toBe("PARA500");
      expect(http.lastCall?.options?.skipAuth).toBeUndefined();

      const med = await client.medications.get("med-1");
      expect(med.success).toBe(true);
      expect(med.data?.code).toBe("PARA500");

      const services = await client.services.list();
      expect(services.success).toBe(true);
      expect(services.data?.items[0]?.code).toBe("CONS01");

      const diagnoses = await client.diagnoses.list();
      expect(diagnoses.success).toBe(true);
      expect(diagnoses.data?.items[0]?.code).toBe("A00");

      const facilities = await client.facilities.searchByCode("VIHC001");
      expect(facilities.success).toBe(true);
      expect(facilities.data?.items[0]?.code).toBe("VIHC001");
      expect(http.lastCall?.path).toContain("hf_code=VIHC001");
    });
  });

  describe("claims / encounters / preauths", () => {
    it("lists and submits claims", async () => {
      const { http, client } = createClient();
      http
        .on(
          "GET",
          "/emr-developer-api/claims/",
          searchBundle("Claim", [sampleClaimFhir()])
        )
        .on("POST", "/emr-developer-api/claims/$submit/", {
          message: "Claim submitted successfully",
          data: { ok: true },
        });

      const page = await client.claims.list(
        new ClaimListFilters(0, 10, undefined, undefined, undefined, "CHF123456")
      );
      expect(page.success).toBe(true);
      expect(page.data?.items[0]?.code).toBe("CLM-001");
      expect(http.lastCall?.path).toContain("/emr-developer-api/claims/");

      const submit = await client.claims.submit([
        new ClaimModel("id", "CLM-001", "ENTERED", "CHF123456"),
      ]);
      expect(submit.success).toBe(true);
      expect(submit.data?.message).toContain("submitted");
      expect(http.lastCall?.path).toBe("/emr-developer-api/claims/$submit/");
    });

    it("creates encounters and bulk-submits", async () => {
      const { http, client } = createClient();
      const fhir = sampleClaimFhir();
      http
        .on("POST", "/emr-developer-api/encounters/", fhir)
        .on("POST", "/emr-developer-api/encounters/$bulk-submit/", {
          message: "ok",
          data: null,
        });

      const created = await client.encounters.create(
        new ClaimModel("id", "ENC-1", "ENTERED", "CHF123456")
      );
      expect(created.success).toBe(true);
      expect(created.data?.patientChfId).toBe("CHF123456");
      expect(
        (http.calls[0]?.body as fhir4.Claim).type?.coding?.[0]?.code
      ).toBe("C");

      const bulk = await client.encounters.bulkSubmit([
        new ClaimModel("id", "ENC-1", "ENTERED", "CHF123456"),
      ]);
      expect(bulk.success).toBe(true);
      expect(bulk.data?.message).toBe("ok");
      expect(http.lastCall?.path).toBe(
        "/emr-developer-api/encounters/$bulk-submit/"
      );
    });

    it("lists encounters with diagnosis filter", async () => {
      const { http, client } = createClient();
      http.on(
        "GET",
        "/emr-developer-api/encounters/",
        searchBundle("Claim", [sampleClaimFhir()])
      );

      await client.encounters.list(
        new EncounterListFilters(
          0,
          5,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          "A00"
        )
      );
      expect(http.lastCall?.path).toContain("primaryDiagnosisCode=A00");
    });

    it("creates preauthorizations", async () => {
      const { http, client } = createClient();
      http.on(
        "POST",
        "/emr-developer-api/preauthorizations/",
        samplePreauthFhir()
      );

      const created = await client.preauthorizations.create(
        new PreauthorizationModel("preauth-1", "Entered", "CHF123456")
      );
      expect(created.success).toBe(true);
      expect(created.data?.patientChfId).toBe("CHF123456");
    });
  });

  describe("claim lines", () => {
    it("creates and deletes claim items (no update)", async () => {
      const { http, client } = createClient();
      const fhir = sampleChargeItemFhir();
      http
        .on("POST", "/emr-developer-api/claim-or-encounter-items/", fhir)
        .on(
          "DELETE",
          "/emr-developer-api/claim-or-encounter-items/ci-1/",
          undefined
        )
        .on(
          "GET",
          "/emr-developer-api/claim-or-encounter-attachments/",
          searchBundle("DocumentReference", [sampleDocumentReferenceFhir()])
        );

      const created = await client.claimItems.create(
        new ClaimChargeItemModel("ci-1", "ITEM001", "Item", "active", "CHF123456")
      );
      expect(created.success).toBe(true);
      expect(created.data?.code).toBe("ITEM001");

      await client.claimItems.delete("ci-1");
      expect(http.lastCall?.method).toBe("DELETE");

      const attachments = await client.claimAttachments.list();
      expect(attachments.success).toBe(true);
      expect(attachments.data?.items[0]?.id).toBe("att-1");
    });
  });
});
