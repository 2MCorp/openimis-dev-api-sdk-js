/** Browser connectivity per `navigator.onLine` (true when unknown, e.g. during SSR). */
export function isBrowserOnline(): boolean {
  return typeof navigator === "undefined" || navigator.onLine !== false;
}

/**
 * Listen for online/offline transitions. Compatible with `useSyncExternalStore`'s `subscribe`;
 * returns the unsubscribe function.
 */
export function subscribeOnlineStatus(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("online", listener);
  window.addEventListener("offline", listener);
  return () => {
    window.removeEventListener("online", listener);
    window.removeEventListener("offline", listener);
  };
}

/**
 * True when changes cannot be saved right now: the browser reports no network, or the app
 * layout could not reach the server and fell back to the on-device session
 * (`serverOfflineFallback`). Writes always need the server.
 */
export function isOffline(serverOfflineFallback = false): boolean {
  return !isBrowserOnline() || serverOfflineFallback;
}
