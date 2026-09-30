/**
 * Developer API Event Bus (`/event-bus/`) — SSE paths and payload types.
 *
 * Backend: openimis-be-developer_api_event_bus_py
 * Auth: Knox `Token` or HF `Api-Key` (same as other HF endpoints).
 */

/** Plugin URL prefix under `/developer_api`. */
export const EVENT_BUS_BASE_PATH = "/event-bus";

/** Claim/encounter lifecycle stream for the authenticated health facility. */
export const HF_UPDATE_SSE_PATH =
  "/event-bus/sse-events/health-facility-update-sses/";

/** Submit / mutation progress stream for the authenticated health facility. */
export const HF_MUTATION_SSE_PATH =
  "/event-bus/sse-events/health-facility-mutation-operation-sses/";

/** Policy-holder update stream (entity scoped by auth). */
export const PH_UPDATE_SSE_PATH =
  "/event-bus/sse-events/policy-holder-update-sses/";

/** Policy-holder mutation stream. */
export const PH_MUTATION_SSE_PATH =
  "/event-bus/sse-events/policy-holder-mutation-operation-sses/";

/** django-eventstream `event:` name for claim lifecycle publishes. */
export const HF_UPDATE_EVENT_TYPE = "message";

/** django-eventstream `event:` name used by claim submit publishes. */
export const HF_MUTATION_EVENT_TYPE = "sse";

export type HfSseStreamKind = "update" | "mutation";

/** Entity discriminator on HF update SSE payloads. */
export type HfUpdateEntity = "claim" | "preauthorization";

/**
 * Normalized HF update notification
 * (SSE `data` from health-facility-update-sses).
 *
 * Claims/encounters and preauthorizations share this wire shape:
 * `{ entity?, message, data: "<json string>" }`.
 */
export type HfClaimLifecycleNotification = {
  message: string;
  /** Defaults to `"claim"` when the backend omits `entity`. */
  entity: HfUpdateEntity;
  /** Parsed claim dict from nested JSON `data`, when entity is claim. */
  claim?: Record<string, unknown>;
  /** Parsed preauth dict from nested JSON `data`, when entity is preauthorization. */
  preauthorization?: Record<string, unknown>;
  claimId?: string;
  claimCode?: string;
  /** Preauthorization id or uuid for deep links. */
  preauthorizationId?: string;
  /** Patient display name from SSE payload (`patient_name`). */
  patientName?: string;
  /** Patient CHF ID from SSE payload (`patient_chf_id`). */
  patientChfId?: string;
  /** OpenIMIS visit_type — `"C"` for encounters. */
  visitType?: string;
  status?: string;
  raw: unknown;
};

/**
 * Normalized mutation / submit notification
 * (SSE `data` from health-facility-mutation-operation-sses).
 */
export type HfMutationNotification = {
  event: string;
  message: string;
  claimId?: string;
  status?: string;
  raw: unknown;
};

export type SseWireEvent = {
  type: string;
  data: string;
  id?: string;
};

export type SseSubscription = {
  /** Close the stream and abort the underlying fetch. */
  close: () => void;
  /** True after the response headers arrived successfully. */
  readonly open: boolean;
};

export type EventBusSubscribeOptions = {
  lastEventId?: string;
  signal?: AbortSignal;
  onEvent: (event: SseWireEvent) => void;
  onOpen?: () => void;
  onError?: (error: Error) => void;
};

export type HfUpdateSubscribeOptions = Omit<
  EventBusSubscribeOptions,
  "onEvent"
> & {
  onNotification: (notification: HfClaimLifecycleNotification) => void;
  /** Also receive raw wire events (defaults to only parsed notifications). */
  onRawEvent?: (event: SseWireEvent) => void;
};

export type HfMutationSubscribeOptions = Omit<
  EventBusSubscribeOptions,
  "onEvent"
> & {
  onNotification: (notification: HfMutationNotification) => void;
  onRawEvent?: (event: SseWireEvent) => void;
};
