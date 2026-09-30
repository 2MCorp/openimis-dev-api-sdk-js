import type {
  HfClaimLifecycleNotification,
  HfMutationNotification,
  HfUpdateEntity,
  SseWireEvent,
} from "./types";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function pickString(
  record: Record<string, unknown> | null,
  ...keys: string[]
): string | undefined {
  if (!record) return undefined;
  for (const key of keys) {
    const value = record[key];
    if (value != null && String(value).trim()) return String(value);
  }
  return undefined;
}

function resolveEntity(
  record: Record<string, unknown>,
  nested: Record<string, unknown> | undefined
): HfUpdateEntity {
  const explicit = record.entity ?? record.kind;
  if (
    explicit === "preauthorization" ||
    explicit === "preauth" ||
    explicit === "pre_authorization"
  ) {
    return "preauthorization";
  }
  if (explicit === "claim" || explicit === "encounter") {
    return "claim";
  }

  const message =
    typeof record.message === "string" ? record.message.toLowerCase() : "";
  if (message.includes("pre-authorization") || message.includes("preauthorization")) {
    return "preauthorization";
  }

  // Infer from nested payload fields when entity is omitted.
  if (
    nested &&
    (nested.pra_status != null ||
      nested.PreauthorizationStatus != null ||
      ((nested.ref_hf_from != null || nested.ref_hf_to != null) &&
        nested.visit_type == null &&
        nested.code == null))
  ) {
    return "preauthorization";
  }
  return "claim";
}

/**
 * Parse HF update SSE payload (claim/encounter or preauthorization).
 * Backend sends `{ entity?, message, data: "<json string of model_to_dict(...)>" }`.
 */
export function parseHfClaimLifecycleData(
  raw: string
): HfClaimLifecycleNotification | null {
  try {
    const outer = JSON.parse(raw) as unknown;
    const record = asRecord(outer);
    if (!record) return null;

    const message =
      typeof record.message === "string" && record.message.trim()
        ? record.message.trim()
        : "Notification";

    let nested: Record<string, unknown> | undefined;
    if (typeof record.data === "string" && record.data.trim()) {
      try {
        nested = asRecord(JSON.parse(record.data)) ?? undefined;
      } catch {
        nested = undefined;
      }
    } else {
      nested = asRecord(record.data) ?? undefined;
    }

    const entity = resolveEntity(record, nested);

    const patientName = pickString(
      nested ?? null,
      "patient_name",
      "patientName"
    );
    const patientChfId = pickString(
      nested ?? null,
      "patient_chf_id",
      "patientChfId",
      "insuree_chf_id"
    );

    if (entity === "preauthorization") {
      const status =
        nested?.pra_status != null
          ? String(nested.pra_status)
          : nested?.status != null
            ? String(nested.status)
            : undefined;
      // Linked claim after approval (claim_uuid preferred; claim FK id as fallback).
      const claimId =
        pickString(nested ?? null, "claim_uuid", "claimUuid") ||
        pickString(nested ?? null, "claim_id", "claimId") ||
        (nested?.claim != null && typeof nested.claim !== "object"
          ? String(nested.claim)
          : pickString(asRecord(nested?.claim), "uuid", "id"));
      const claimCode =
        pickString(nested ?? null, "claim_code", "claimCode") ||
        pickString(asRecord(nested?.claim), "code");
      const visitType =
        pickString(nested ?? null, "claim_visit_type", "claimVisitType") ||
        pickString(asRecord(nested?.claim), "visit_type", "visitType");

      return {
        message,
        entity,
        preauthorization: nested,
        preauthorizationId: pickString(nested ?? null, "uuid", "id"),
        claimId,
        claimCode,
        patientName,
        patientChfId,
        visitType,
        status,
        raw: outer,
      };
    }

    return {
      message,
      entity: "claim",
      claim: nested,
      // Prefer uuid — portal claim routes resolve by uuid more reliably than numeric id.
      claimId: pickString(nested ?? null, "uuid", "id"),
      claimCode: pickString(nested ?? null, "code"),
      patientName,
      patientChfId,
      visitType: pickString(nested ?? null, "visit_type", "visitType"),
      status: nested?.status != null ? String(nested.status) : undefined,
      raw: outer,
    };
  } catch {
    return null;
  }
}

/** Alias — HF update stream carries claims and preauthorizations. */
export const parseHfUpdateData = parseHfClaimLifecycleData;

/**
 * Parse mutation/submit SSE payload.
 * Backend sends `{ event, claim_id, status }` with `event_type: "sse"`.
 */
export function parseHfMutationData(
  raw: string
): HfMutationNotification | null {
  try {
    const outer = JSON.parse(raw) as unknown;
    const record = asRecord(outer);
    if (!record) return null;

    const event =
      typeof record.event === "string" && record.event.trim()
        ? record.event.trim()
        : "mutation";
    const status =
      record.status != null ? String(record.status) : undefined;
    const claimId = pickString(record, "claim_id", "claimId");

    return {
      event,
      message: status ? `${event}: ${status}` : event,
      claimId,
      status,
      raw: outer,
    };
  } catch {
    return null;
  }
}

/**
 * Incremental SSE parser for `text/event-stream` chunks.
 * Call `push(chunk)` as data arrives; returns completed events.
 */
export class SseStreamParser {
  private buffer = "";

  push(chunk: string): SseWireEvent[] {
    this.buffer += chunk;
    const events: SseWireEvent[] = [];

    // SSE events are separated by a blank line
    let splitAt: number;
    while ((splitAt = indexOfEventBoundary(this.buffer)) !== -1) {
      const block = this.buffer.slice(0, splitAt);
      this.buffer = this.buffer.slice(splitAt).replace(/^\r?\n/, "");
      const event = parseSseBlock(block);
      if (event) events.push(event);
    }

    return events;
  }

  /** Flush any trailing incomplete block (usually empty on clean close). */
  flush(): SseWireEvent[] {
    if (!this.buffer.trim()) {
      this.buffer = "";
      return [];
    }
    const event = parseSseBlock(this.buffer);
    this.buffer = "";
    return event ? [event] : [];
  }
}

function indexOfEventBoundary(text: string): number {
  const lf = text.indexOf("\n\n");
  const crlf = text.indexOf("\r\n\r\n");
  if (lf === -1) return crlf;
  if (crlf === -1) return lf;
  return Math.min(lf, crlf);
}

function parseSseBlock(block: string): SseWireEvent | null {
  const lines = block.split(/\r?\n/);
  let type = "message";
  let id: string | undefined;
  const dataLines: string[] = [];

  for (const line of lines) {
    if (!line || line.startsWith(":")) continue;
    const colon = line.indexOf(":");
    const field = colon === -1 ? line : line.slice(0, colon);
    let value = colon === -1 ? "" : line.slice(colon + 1);
    if (value.startsWith(" ")) value = value.slice(1);

    switch (field) {
      case "event":
        type = value || "message";
        break;
      case "data":
        dataLines.push(value);
        break;
      case "id":
        id = value;
        break;
      default:
        break;
    }
  }

  if (dataLines.length === 0) return null;
  return { type, data: dataLines.join("\n"), id };
}
