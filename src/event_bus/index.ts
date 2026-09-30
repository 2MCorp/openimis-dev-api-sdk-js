import HttpClient from "../types";
import EventBusClient from "./sse";

/**
 * Client for `/event-bus/` SSE (and related) endpoints.
 */
class EventBusDevAPIClient {
  public readonly sse: EventBusClient;

  constructor(httpClient: HttpClient) {
    this.sse = new EventBusClient(httpClient);
  }

  /** Convenience: HF claim/encounter lifecycle stream. */
  subscribeHealthFacilityUpdates(
    ...args: Parameters<EventBusClient["subscribeHealthFacilityUpdates"]>
  ) {
    return this.sse.subscribeHealthFacilityUpdates(...args);
  }

  /** Convenience: HF mutation/submit stream. */
  subscribeHealthFacilityMutations(
    ...args: Parameters<EventBusClient["subscribeHealthFacilityMutations"]>
  ) {
    return this.sse.subscribeHealthFacilityMutations(...args);
  }
}

export default EventBusDevAPIClient;
export { EventBusClient };
export * from "./types";
export {
  parseHfClaimLifecycleData,
  parseHfUpdateData,
  parseHfMutationData,
  SseStreamParser,
} from "./parse";
