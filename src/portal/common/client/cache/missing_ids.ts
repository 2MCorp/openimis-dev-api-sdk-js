export type MissingIdStoreOptions = {
  /** sessionStorage key, e.g. `hf_portal_missing_patients`. */
  storageKey: string;
  maxEntries?: number;
};

/**
 * Remembers identifiers (e.g. CHF ids) that 404'd in this browser session so repeat lookups are
 * skipped. Backed by `sessionStorage`; a no-op where it is unavailable.
 */
export function createMissingIdStore(options: MissingIdStoreOptions) {
  const { storageKey, maxEntries = 50 } = options;

  function readSet(): Set<string> {
    if (typeof sessionStorage === "undefined") return new Set();
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (!raw) return new Set();
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return new Set();
      return new Set(parsed.map(String).filter(Boolean));
    } catch {
      return new Set();
    }
  }

  function writeSet(ids: Set<string>): void {
    if (typeof sessionStorage === "undefined") return;
    try {
      sessionStorage.setItem(storageKey, JSON.stringify([...ids].slice(-maxEntries)));
    } catch {
      /* ignore quota */
    }
  }

  return {
    isMissing(id: string): boolean {
      const trimmed = id.trim();
      return trimmed ? readSet().has(trimmed) : false;
    },
    markMissing(id: string): void {
      const trimmed = id.trim();
      if (!trimmed) return;
      const next = readSet();
      next.add(trimmed);
      writeSet(next);
    },
    clear(): void {
      if (typeof sessionStorage === "undefined") return;
      try {
        sessionStorage.removeItem(storageKey);
      } catch {
        /* ignore */
      }
    },
  };
}

/** HF store of CHF ids missing from OpenIMIS. */
export function createMissingPatientStore() {
  return createMissingIdStore({ storageKey: "hf_portal_missing_patients" });
}
