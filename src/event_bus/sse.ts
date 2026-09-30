import HttpClient from "../types";
import {
  parseHfClaimLifecycleData,
  parseHfMutationData,
  SseStreamParser,
} from "./parse";
import {
  HF_MUTATION_EVENT_TYPE,
  HF_MUTATION_SSE_PATH,
  HF_UPDATE_EVENT_TYPE,
  HF_UPDATE_SSE_PATH,
  type EventBusSubscribeOptions,
  type HfMutationSubscribeOptions,
  type HfUpdateSubscribeOptions,
  type SseSubscription,
  type SseWireEvent,
} from "./types";

/**
 * Event Bus SSE client.
 *
 * Uses `fetch` + streaming (supports `Authorization` headers).
 * Prefer this over browser `EventSource` when calling the Developer API
 * directly. Browser apps that keep the Knox token server-side should
 * proxy these paths and may still use `EventSource` against the proxy
 * while reusing {@link parseHfClaimLifecycleData} / {@link parseHfMutationData}.
 */
class EventBusClient {
  constructor(private readonly httpClient: HttpClient) {}

  /** Absolute URL for an event-bus path (e.g. HF update SSE). */
  urlFor(path: string): string {
    const base = this.httpClient.getBaseUrl().replace(/\/$/, "");
    const normalized = path.startsWith("/") ? path : `/${path}`;
    return `${base}${normalized}`;
  }

  /** HF claim/encounter lifecycle stream. */
  subscribeHealthFacilityUpdates(
    options: HfUpdateSubscribeOptions
  ): SseSubscription {
    return this.subscribe(HF_UPDATE_SSE_PATH, {
      ...options,
      onEvent: (wire) => {
        options.onRawEvent?.(wire);
        if (wire.type !== HF_UPDATE_EVENT_TYPE && wire.type !== "message") {
          return;
        }
        const parsed = parseHfClaimLifecycleData(wire.data);
        if (parsed) options.onNotification(parsed);
      },
    });
  }

  /** HF submit / mutation progress stream. */
  subscribeHealthFacilityMutations(
    options: HfMutationSubscribeOptions
  ): SseSubscription {
    return this.subscribe(HF_MUTATION_SSE_PATH, {
      ...options,
      onEvent: (wire) => {
        options.onRawEvent?.(wire);
        if (
          wire.type !== HF_MUTATION_EVENT_TYPE &&
          wire.type !== "message"
        ) {
          return;
        }
        const parsed = parseHfMutationData(wire.data);
        if (parsed) options.onNotification(parsed);
      },
    });
  }

  /**
   * Low-level SSE subscribe to any event-bus path.
   * Attaches the HttpClient auth scheme/token automatically.
   */
  subscribe(
    path: string,
    options: EventBusSubscribeOptions
  ): SseSubscription {
    const controller = new AbortController();
    let open = false;

    if (options.signal) {
      if (options.signal.aborted) {
        controller.abort();
      } else {
        options.signal.addEventListener(
          "abort",
          () => controller.abort(),
          { once: true }
        );
      }
    }

    const run = async () => {
      const headers = this.httpClient.getAuthHeaders({
        headers: {
          Accept: "text/event-stream",
          // Avoid JSON content-type on SSE GETs
          "Content-Type": "text/event-stream",
        },
      });
      // Remove mistaken Content-Type application/json from buildHeaders default
      delete headers["Content-Type"];
      headers.Accept = "text/event-stream";

      if (options.lastEventId) {
        headers["Last-Event-ID"] = options.lastEventId;
      }

      let response: Response;
      try {
        response = await fetch(this.urlFor(path), {
          method: "GET",
          headers,
          signal: controller.signal,
        });
      } catch (err) {
        if (controller.signal.aborted) return;
        options.onError?.(
          err instanceof Error ? err : new Error(String(err))
        );
        return;
      }

      if (!response.ok || !response.body) {
        const text = await response.text().catch(() => "");
        options.onError?.(
          new Error(
            text ||
              `SSE subscribe failed (${response.status}) for ${path}`
          )
        );
        return;
      }

      open = true;
      options.onOpen?.();

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      const parser = new SseStreamParser();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          for (const event of parser.push(chunk)) {
            emit(event);
          }
        }
        for (const event of parser.flush()) {
          emit(event);
        }
      } catch (err) {
        if (controller.signal.aborted) return;
        options.onError?.(
          err instanceof Error ? err : new Error(String(err))
        );
      } finally {
        open = false;
      }

      function emit(event: SseWireEvent) {
        try {
          options.onEvent(event);
        } catch (err) {
          options.onError?.(
            err instanceof Error ? err : new Error(String(err))
          );
        }
      }
    };

    void run();

    return {
      get open() {
        return open;
      },
      close: () => {
        controller.abort();
        open = false;
      },
    };
  }
}

export default EventBusClient;
