import { describe, expect, it } from "vitest";
import HealthFacilityDevAPIClient from "../src/healthfacility/index";
import {
  ClaimListFilters,
  ClaimLineListFilters,
  EncounterListFilters,
  FhirListParams,
  PatientReferenceListFilters,
} from "../src/healthfacility/types";
import { ClaimModel, ClaimAttachmentModel } from "../src/models/claim";
import { ClaimChargeItemModel } from "../src/models/claim_charge_item";
import { PreauthorizationModel } from "../src/models/preauthorization";
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
    client: new HealthFacilityDevAPIClient(http.asHttpClient()),
  };
}

describe("HealthFacilityDevAPIClient", () => {
  describe("patients", () => {
    it("searches by CHF id with skipAuth", async () => {
      const { http, client } = createClient();
      http.on("GET", "/health-facility-dev-api/search-patient/", samplePatientFhir());

      const patient = await client.patients.getByChfId("CHF123456");

      expect(patient.chfId).toBe("CHF123456");
      expect(patient.lastName).toBe("Doe");
      expect(http.lastCall?.path).toContain("identifier=CHF123456");
      expect(http.lastCall?.options?.skipAuth).toBe(true);
    });

    it("gets by identifier path with skipAuth", async () => {
      const { http, client } = createClient();
      http.on(
        "GET",
        "/health-facility-dev-api/search-patient/CHF123456/",
        samplePatientFhir()
      );

      await client.patients.getByIdentifier("CHF123456");

      expect(http.lastCall?.path).toBe(
        "/health-facility-dev-api/search-patient/CHF123456/"
      );
      expect(http.lastCall?.options?.skipAuth).toBe(true);
    });
  });

  describe("claims", () => {
    it("lists claims with filters and converts the search bundle", async () => {
      const { http, client } = createClient();
      http.on(
        "GET",
        "/health-facility-dev-api/claims/",
        searchBundle("Claim", [sampleClaimFhir()])
      );

      const page = await client.claims.list(
        new ClaimListFilters(0, 10, undefined, undefined, undefined, "CHF123456", "entered")
      );

      expect(page.total).toBe(1);
      expect(page.items[0]?.code).toBe("CLM-001");
      expect(page.items[0]?.patientChfId).toBe("CHF123456");
      expect(http.lastCall?.path).toContain("page-offset=0");
      expect(http.lastCall?.path).toContain("_count=10");
      expect(http.lastCall?.path).toContain("patientChfid=CHF123456");
      expect(http.lastCall?.path).toContain("status=entered");
      expect(page.nextUrl).toBe("https://example.test/next");
    });

    it("gets, updates, patches, and submits claims", async () => {
      const { http, client } = createClient();
      const claimFhir = sampleClaimFhir();
      http
        .on("GET", "/health-facility-dev-api/claims/CLM-001/", claimFhir)
        .on("PUT", "/health-facility-dev-api/claims/CLM-001/", claimFhir)
        .on("PATCH", "/health-facility-dev-api/claims/CLM-001/", claimFhir)
        .on("POST", "/health-facility-dev-api/claims/$submit/", {
          message: "submitted",
          data: { count: 1 },
        });

      const got = await client.claims.get("CLM-001");
      expect(got.code).toBe("CLM-001");

      const model = new ClaimModel("id", "CLM-001", "ENTERED", "CHF123456");
      const updated = await client.claims.update("CLM-001", model);
      expect(updated.code).toBe("CLM-001");
      expect(http.calls.at(-1)?.method).toBe("PUT");
      expect((http.calls.at(-1)?.body as fhir4.Claim).resourceType).toBe("Claim");

      await client.claims.patch("CLM-001", model);
      expect(http.calls.at(-1)?.method).toBe("PATCH");

      const submit = await client.claims.submit([model]);
      expect(submit.message).toBe("submitted");
      expect(http.calls.at(-1)?.path).toBe(
        "/health-facility-dev-api/claims/$submit/"
      );
      expect((http.calls.at(-1)?.body as fhir4.Bundle).type).toBe("collection");
    });
  });

  describe("encounters", () => {
    it("lists, creates, and bulk-submits encounters", async () => {
      const { http, client } = createClient();
      const claimFhir = sampleClaimFhir({ use: "claim" });
      http
        .on(
          "GET",
          "/health-facility-dev-api/encounters/",
          searchBundle("Claim", [claimFhir])
        )
        .on("POST", "/health-facility-dev-api/encounters/", claimFhir)
        .on("POST", "/health-facility-dev-api/encounters/$bulk-submit/", {
          message: "ok",
          data: null,
        });

      const page = await client.encounters.list(
        new EncounterListFilters(
          1,
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
      expect(page.items).toHaveLength(1);
      expect(http.lastCall?.path).toContain("primaryDiagnosisCode=A00");
      expect(http.lastCall?.path).toContain("page-offset=1");

      const model = new ClaimModel("id", "ENC-1", "ENTERED", "CHF123456");
      const created = await client.encounters.create(model);
      expect(created.patientChfId).toBe("CHF123456");

      const bulk = await client.encounters.bulkSubmit([model]);
      expect(bulk.message).toBe("ok");
      expect(http.lastCall?.path).toBe(
        "/health-facility-dev-api/encounters/$bulk-submit/"
      );
    });
  });

  describe("preauthorizations", () => {
    it("lists and creates preauthorizations", async () => {
      const { http, client } = createClient();
      const fhir = samplePreauthFhir();
      http
        .on(
          "GET",
          "/health-facility-dev-api/preauthorizations/",
          searchBundle("Claim", [fhir])
        )
        .on("POST", "/health-facility-dev-api/preauthorizations/", fhir);

      const page = await client.preauthorizations.list(new FhirListParams(0, 20));
      expect(page.items[0]?.id).toBeTruthy();
      expect(http.lastCall?.path).toContain("_count=20");

      const created = await client.preauthorizations.create(
        new PreauthorizationModel("preauth-1", "Entered", "CHF123456")
      );
      expect(created.patientChfId).toBe("CHF123456");
    });
  });

  describe("claim items / services / attachments", () => {
    it("CRUDs claim items via ChargeItem mapping", async () => {
      const { http, client } = createClient();
      const fhir = sampleChargeItemFhir();
      http
        .on(
          "GET",
          "/health-facility-dev-api/claim-or-encounter-items/",
          searchBundle("ChargeItem", [fhir])
        )
        .on(
          "GET",
          "/health-facility-dev-api/claim-or-encounter-items/ci-1/",
          fhir
        )
        .on("POST", "/health-facility-dev-api/claim-or-encounter-items/", fhir)
        .on("PUT", "/health-facility-dev-api/claim-or-encounter-items/ci-1/", fhir)
        .on("DELETE", "/health-facility-dev-api/claim-or-encounter-items/ci-1/", undefined);

      const page = await client.claimItems.list(
        new ClaimLineListFilters(0, 10, "22222222-2222-4222-8222-222222222222")
      );
      expect(page.items[0]?.code).toBe("ITEM001");
      expect(page.items[0]?.quantity).toBe(2);

      const got = await client.claimItems.get("ci-1");
      expect(got.id).toBe("ci-1");

      const model = new ClaimChargeItemModel(
        "ci-1",
        "ITEM001",
        "Item 001",
        "active",
        "CHF123456",
        "22222222-2222-4222-8222-222222222222",
        2,
        10.5,
        "$"
      );
      await client.claimItems.create(model);
      expect((http.lastCall?.body as fhir4.ChargeItem).resourceType).toBe(
        "ChargeItem"
      );

      await client.claimItems.update("ci-1", model);
      await client.claimItems.delete("ci-1");
      expect(http.lastCall?.method).toBe("DELETE");
    });

    it("lists claim services and attachments", async () => {
      const { http, client } = createClient();
      http
        .on(
          "GET",
          "/health-facility-dev-api/claim-or-encounter-services/",
          searchBundle("ChargeItem", [sampleChargeItemFhir({ id: "svc-ci" })])
        )
        .on(
          "GET",
          "/health-facility-dev-api/claim-or-encounter-attachments/",
          searchBundle("DocumentReference", [sampleDocumentReferenceFhir()])
        )
        .on(
          "POST",
          "/health-facility-dev-api/claim-or-encounter-attachments/",
          sampleDocumentReferenceFhir()
        );

      const services = await client.claimServices.list();
      expect(services.items[0]?.id).toBe("svc-ci");

      const attachments = await client.claimAttachments.list();
      expect(attachments.items[0]?.filename ?? attachments.items[0]?.title).toBe(
        "lab-report.pdf"
      );

      const created = await client.claimAttachments.create(
        new ClaimAttachmentModel(undefined, "lab-report.pdf", "lab-report.pdf", "application/pdf"),
        "claim-uuid"
      );
      expect(created.id).toBe("att-1");
      expect(
        (http.lastCall?.body as fhir4.DocumentReference).identifier?.[0]?.value
      ).toBe("claim-uuid");
    });
  });

  describe("catalog endpoints (public)", () => {
    it("lists medications, services, and diagnoses with skipAuth", async () => {
      const { http, client } = createClient();
      http
        .on(
          "GET",
          "/health-facility-dev-api/medications/",
          searchBundle("Medication", [sampleMedicationFhir()])
        )
        .on(
          "GET",
          "/health-facility-dev-api/services/",
          searchBundle("ChargeItemDefinition", [
            sampleChargeItemDefinitionFhir(),
          ])
        )
        .on(
          "GET",
          "/health-facility-dev-api/diagnoses/",
          searchBundle("CodeSystem", [sampleCodeSystemFhir()])
        )
        .on(
          "GET",
          "/health-facility-dev-api/diagnoses/icd-1/",
          sampleCodeSystemFhir()
        );

      const meds = await client.medications.list(new FhirListParams(0, 5));
      expect(meds.items[0]?.code).toBe("PARA500");
      expect(http.calls.at(-1)?.options?.skipAuth).toBe(true);

      const services = await client.services.list();
      expect(services.items[0]?.code).toBe("CONS01");
      expect(services.items[0]?.name).toBe("Consultation");
      expect(http.calls.at(-1)?.options?.skipAuth).toBe(true);

      const diagnoses = await client.diagnoses.list();
      expect(diagnoses.items[0]?.code).toBe("A00");
      expect(http.calls.at(-1)?.options?.skipAuth).toBe(true);

      const one = await client.diagnoses.get("icd-1");
      expect(one[0]?.code).toBe("A00");
      expect(http.lastCall?.options?.skipAuth).toBe(true);
    });
  });

  describe("facilities + patient references", () => {
    it("searches facilities by code/name with skipAuth", async () => {
      const { http, client } = createClient();
      http.on(
        "GET",
        "/health-facility-dev-api/health-facilities/",
        searchBundle("Location", [sampleLocationFhir()])
      );

      const byCode = await client.facilities.searchByCode("VIHC001");
      expect(byCode.items[0]?.code).toBe("VIHC001");
      expect(http.lastCall?.path).toContain("hf_code=VIHC001");
      expect(http.lastCall?.options?.skipAuth).toBe(true);

      await client.facilities.searchByName("Demo");
      expect(http.lastCall?.path).toContain("hf_name=Demo");
    });

    it("lists patient references with include filters", async () => {
      const { http, client } = createClient();
      http.on(
        "GET",
        "/health-facility-dev-api/patient-references/",
        searchBundle("Patient", [samplePatientFhir()])
      );

      const page = await client.patientReferences.list(
        new PatientReferenceListFilters(
          0,
          10,
          "CHF123456",
          undefined,
          undefined,
          ["Coverage"]
        )
      );

      expect(page.items[0]?.chfId).toBe("CHF123456");
      expect(http.lastCall?.path).toContain("chfid=CHF123456");
      expect(http.lastCall?.path).toContain("include=Coverage");
    });
  });
});
