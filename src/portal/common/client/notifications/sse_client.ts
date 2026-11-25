export type SseStreamConfig<TKind extends string, TPayload> = {
  /** Same-origin proxy path (the Knox token is attached server-side). */
  path: string;
  kind: TKind;
  /** SSE event names to listen for (django-eventstream uses these as `event:`). */
  eventNames: string[];
  /** Parse the raw `data:` string; return null to ignore the event. */
  parse: (data: string) => TPayload | null;
};

export type SseNotificationClientOptions<TKind extends string, TPayload> = {
  streams: SseStreamConfig<TKind, TPayload>[];
  /** A parsed event arrived. */
  onPayload: (kind: TKind, payload: TPayload) => void;
  /** Connection state (EventSource reconnects automatically after an error). */
  onConnectionChange?: (connected: boolean) => void;
  /** Override for tests. */
  eventSourceFactory?: (url: string) => EventSource;
};

/**
 * Generic multi-stream SSE client. Wire the SDK parsers (`parseHfClaimLifecycleData`,
 * `parseHfMutationData`) as `parse`, and toast / store / OS notifications in `onPayload`.
 */
export function createSseNotificationClient<TKind extends string, TPayload>(
  options: SseNotificationClientOptions<TKind, TPayload>,
) {
  let sources: EventSource[] = [];
  let started = false;
  const make = options.eventSourceFactory ?? ((url: string) => new EventSource(url));

  function connect(config: SseStreamConfig<TKind, TPayload>) {
    const es = make(config.path);
    es.onopen = () => options.onConnectionChange?.(true);
    es.onerror = () => options.onConnectionChange?.(false);

    for (const name of config.eventNames) {
      es.addEventListener(name, (ev) => {
        const data = (ev as MessageEvent).data;
        if (typeof data !== "string" || !data.trim()) return;
        const payload = config.parse(data);
        if (payload) options.onPayload(config.kind, payload);
      });
    }
    sources.push(es);
  }

  return {
    start(): void {
      if (started) return;
      if (!options.eventSourceFactory && typeof window === "undefined") return;
      started = true;
      for (const stream of options.streams) connect(stream);
    },
    stop(): void {
      for (const es of sources) es.close();
      sources = [];
      started = false;
      options.onConnectionChange?.(false);
    },
  };
}
