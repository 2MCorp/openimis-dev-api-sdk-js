/**
 * Framework-agnostic service-worker core for the portals: precache immutable build output,
 * never touch authenticated HTML / API data, and fall back to a public offline shell when a
 * page navigation fails. Call `installPortalServiceWorker(self, options)` from the worker file.
 */

/** The slice of `ServiceWorkerGlobalScope` the core uses (avoids needing the webworker lib). */
export type PortalServiceWorkerScope = {
  location: { origin: string };
  clients: { claim(): Promise<void> };
  skipWaiting(): Promise<void>;
  addEventListener(type: string, listener: (event: any) => void): void;
};

export type PortalServiceWorkerOptions = {
  /** Cache name prefix, e.g. `hf-portal-static-`; old caches with this prefix are deleted. */
  cachePrefix: string;
  /** Build id appended to the cache name. */
  version: string;
  /** Immutable build output + static files (pathnames). */
  precache: readonly string[];
  /** Public shell cached on install (e.g. `/offline`). */
  offlineUrl: string;
  /** Paths the worker must never touch (streams, session changes). */
  passThrough: (url: URL) => boolean;
  /**
   * Response for a navigation that failed (default: the cached shell). Receives the cache and
   * the requested URL so the shell can be told what the user asked for.
   */
  onNavigationFailure?: (ctx: { url: URL; cache: Cache; offlineUrl: string }) => Promise<Response>;
};

/** Redirect to the offline shell, remembering the requested path (`?to=`). */
export function redirectToOfflineShell(url: URL, offlineUrl: string, origin: string): Response {
  const to = `${url.pathname}${url.search}`;
  const target = new URL(offlineUrl, origin);
  if (url.pathname !== offlineUrl) target.searchParams.set("to", to);
  return Response.redirect(target.href, 302);
}

const PLAIN_OFFLINE = () =>
  new Response("You are offline.", {
    status: 503,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });

export function installPortalServiceWorker(
  sw: PortalServiceWorkerScope,
  options: PortalServiceWorkerOptions,
): void {
  const cacheName = `${options.cachePrefix}${options.version}`;
  const precacheSet = new Set(options.precache);

  sw.addEventListener("install", (event) => {
    event.waitUntil(
      (async () => {
        const cache = await caches.open(cacheName);
        await cache.addAll([...options.precache]);
        // The offline shell is public (no session guard), so it is safe to cache.
        try {
          await cache.add(options.offlineUrl);
        } catch {
          // Best-effort; the app still works online without it.
        }
      })(),
    );
    // No skipWaiting() here: updates are applied when the user accepts the "update available"
    // toast (SKIP_WAITING message) so an open form is never swapped mid-edit.
  });

  sw.addEventListener("activate", (event) => {
    event.waitUntil(
      (async () => {
        for (const key of await caches.keys()) {
          if (key.startsWith(options.cachePrefix) && key !== cacheName) await caches.delete(key);
        }
        await sw.clients.claim();
      })(),
    );
  });

  sw.addEventListener("message", (event) => {
    if (event.data?.type === "SKIP_WAITING") void sw.skipWaiting();
  });

  sw.addEventListener("fetch", (event) => {
    const request: Request = event.request;
    if (request.method !== "GET") return;

    const url = new URL(request.url);
    if (url.origin !== sw.location.origin || options.passThrough(url)) return;

    // Precached immutable assets: cache-first.
    if (precacheSet.has(url.pathname)) {
      event.respondWith(
        (async () => {
          const cached = await (await caches.open(cacheName)).match(url.pathname);
          return cached ?? fetch(request);
        })(),
      );
      return;
    }

    // The shell itself: network-first so it stays current, cached copy when offline.
    if (request.mode === "navigate" && url.pathname === options.offlineUrl) {
      event.respondWith(
        (async () => {
          try {
            return await fetch(request);
          } catch {
            const shell = await (await caches.open(cacheName)).match(options.offlineUrl);
            return shell ?? PLAIN_OFFLINE();
          }
        })(),
      );
      return;
    }

    // Page navigations: network-first, offline shell as the fallback.
    if (request.mode === "navigate") {
      event.respondWith(
        (async () => {
          try {
            return await fetch(request);
          } catch {
            const cache = await caches.open(cacheName);
            if (options.onNavigationFailure) {
              return options.onNavigationFailure({ url, cache, offlineUrl: options.offlineUrl });
            }
            return (await cache.match(options.offlineUrl)) ?? PLAIN_OFFLINE();
          }
        })(),
      );
    }
    // Everything else (`/api/*`, RSC payloads, ...) goes straight to the network.
  });
}
