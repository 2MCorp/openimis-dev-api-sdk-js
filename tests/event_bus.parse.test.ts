import { describe, expect, it } from "vitest";
import {
  parseHfClaimLifecycleData,
  parseHfMutationData,
  SseStreamParser,
} from "../src/event_bus/parse";

describe("parseHfClaimLifecycleData", () => {
  it("parses nested claim JSON string", () => {
    const claim = {
      id: 42,
      code: "CLM-1",
      visit_type: "C",
      status: 2,
      uuid: "claim-uuid",
      patient_name: "Aisha Bello",
      patient_chf_id: "CHF001",
    };
    const raw = JSON.stringify({
      message: "Claim created",
      data: JSON.stringify(claim),
    });
    const parsed = parseHfClaimLifecycleData(raw);
    expect(parsed?.message).toBe("Claim created");
    expect(parsed?.entity).toBe("claim");
    expect(parsed?.claimId).toBe("claim-uuid");
    expect(parsed?.claimCode).toBe("CLM-1");
    expect(parsed?.patientName).toBe("Aisha Bello");
    expect(parsed?.patientChfId).toBe("CHF001");
    expect(parsed?.visitType).toBe("C");
    expect(parsed?.status).toBe("2");
  });

  it("infers preauthorization from message when entity is omitted", () => {
    const preauth = { id: 7, uuid: "pa-uuid-2", pra_status: "A" };
    const raw = JSON.stringify({
      message: "Your pre-authorization has been approved",
      data: JSON.stringify(preauth),
    });
    const parsed = parseHfClaimLifecycleData(raw);
    expect(parsed?.entity).toBe("preauthorization");
    expect(parsed?.preauthorizationId).toBe("pa-uuid-2");
  });

  it("parses preauthorization approval payload", () => {
    const preauth = {
      id: 7,
      uuid: "pa-uuid-1",
      pra_status: "A",
      claim_uuid: "claim-uuid-9",
      claim_code: "CLM-PA-1",
      claim_visit_type: "R",
      patient_name: "Musa Ali",
      patient_chf_id: "CHF778",
    };
    const raw = JSON.stringify({
      entity: "preauthorization",
      message: "Your pre-authorization has been approved",
      data: JSON.stringify(preauth),
    });
    const parsed = parseHfClaimLifecycleData(raw);
    expect(parsed?.entity).toBe("preauthorization");
    expect(parsed?.message).toContain("approved");
    expect(parsed?.preauthorizationId).toBe("pa-uuid-1");
    expect(parsed?.status).toBe("A");
    expect(parsed?.claimId).toBe("claim-uuid-9");
    expect(parsed?.claimCode).toBe("CLM-PA-1");
    expect(parsed?.patientName).toBe("Musa Ali");
    expect(parsed?.patientChfId).toBe("CHF778");
    expect(parsed?.visitType).toBe("R");
  });
});

describe("parseHfMutationData", () => {
  it("parses submit payload", () => {
    const parsed = parseHfMutationData(
      JSON.stringify({
        event: "claim_submitted",
        claim_id: "99",
        status: "success",
      })
    );
    expect(parsed?.event).toBe("claim_submitted");
    expect(parsed?.claimId).toBe("99");
    expect(parsed?.message).toBe("claim_submitted: success");
  });
});

describe("SseStreamParser", () => {
  it("parses chunked SSE frames", () => {
    const parser = new SseStreamParser();
    const part1 = "event: message\ndata: {\"message\":\"hi\"}";
    const part2 = "\n\nid: ch:1\ndata: {\"a\":1}\n\n";
    expect(parser.push(part1)).toEqual([]);
    const events = parser.push(part2);
    expect(events).toHaveLength(2);
    expect(events[0].type).toBe("message");
    expect(events[0].data).toBe('{"message":"hi"}');
    expect(events[1].id).toBe("ch:1");
  });
});
