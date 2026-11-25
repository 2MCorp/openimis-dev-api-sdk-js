export type ServiceWorkerUpdateOptions = {
  /**
   * A new worker is waiting. Show a prompt and call `apply()` when the user accepts; the worker
   * is intentionally not activated automatically so an in-progress form is never swapped.
   */
  onUpdateAvailable: (apply: () => void) => void;
  /** Reload once the new worker took control. Defaults to `location.reload()`. */
  reload?: () => void;
};

/** Watch for service-worker updates. Returns a cleanup function. */
export function watchServiceWorkerUpdates(options: ServiceWorkerUpdateOptions): () => void {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return () => {};

  let disposed = false;
  let reloading = false;
  // A first install also fires `controllerchange` (clients.claim()); only a page that was
  // already controlled is being upgraded and needs the reload.
  const hadController = !!navigator.serviceWorker.controller;
  const reload = options.reload ?? (() => location.reload());

  const promptFor = (worker: ServiceWorker) => {
    options.onUpdateAvailable(() => worker.postMessage({ type: "SKIP_WAITING" }));
  };

  const onControllerChange = () => {
    if (reloading || !hadController) return;
    reloading = true;
    reload();
  };
  navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

  void navigator.serviceWorker.getRegistration().then((reg) => {
    if (!reg || disposed) return;
    // Only prompt when this page is already controlled; a first install is not an "update".
    if (reg.waiting && navigator.serviceWorker.controller) promptFor(reg.waiting);
    reg.addEventListener("updatefound", () => {
      const installing = reg.installing;
      installing?.addEventListener("statechange", () => {
        if (installing.state === "installed" && navigator.serviceWorker.controller) {
          promptFor(installing);
        }
      });
    });
  });

  return () => {
    disposed = true;
    navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
  };
}
