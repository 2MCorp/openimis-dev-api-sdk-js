import {
  notificationHref,
  notificationSecondaryLabel,
  type PortalNotification,
} from "./href";

export type DesktopPermission = NotificationPermission | "unsupported";

export type DesktopNotificationsOptions = {
  /** localStorage key for the opt-in flag, e.g. `hf_portal_desktop_notifications`. */
  prefKey: string;
  /** Prefix of the OS notification `tag`, e.g. `hf`. */
  tagPrefix: string;
  /** Called when the user clicks the OS notification and the item has a deep link. */
  navigate: (href: string) => void;
};

export function desktopNotificationsSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function getDesktopPermission(): DesktopPermission {
  return desktopNotificationsSupported() ? Notification.permission : "unsupported";
}

/** Browser OS-notification helper for a portal; every method is safe on the server. */
export function createDesktopNotifications(options: DesktopNotificationsOptions) {
  /** User opted in (after granting browser permission). Defaults to on once granted. */
  function isEnabled(): boolean {
    if (typeof localStorage === "undefined") return false;
    if (getDesktopPermission() !== "granted") return false;
    try {
      const raw = localStorage.getItem(options.prefKey);
      return raw == null ? true : raw === "1";
    } catch {
      return true;
    }
  }

  function setEnabled(enabled: boolean): void {
    if (typeof localStorage === "undefined") return;
    try {
      localStorage.setItem(options.prefKey, enabled ? "1" : "0");
    } catch {
      /* private mode */
    }
  }

  /** Request browser permission (must run from a user gesture). */
  async function requestPermission(): Promise<DesktopPermission> {
    if (!desktopNotificationsSupported()) return "unsupported";
    if (Notification.permission === "granted") {
      setEnabled(true);
      return "granted";
    }
    if (Notification.permission === "denied") return "denied";
    const result = await Notification.requestPermission();
    if (result === "granted") setEnabled(true);
    return result;
  }

  /** Push a system notification for an in-app notification (needs permission + opt-in). */
  function show(item: PortalNotification & { id: string }): void {
    if (!desktopNotificationsSupported()) return;
    if (Notification.permission !== "granted" || !isEnabled()) return;

    const href = notificationHref(item);
    try {
      const n = new Notification(item.message, {
        body: notificationSecondaryLabel(item) ?? undefined,
        icon: `${window.location.origin}/favicon.ico`,
        tag: `${options.tagPrefix}-${item.id}`,
      });
      n.onclick = () => {
        window.focus();
        n.close();
        if (href) options.navigate(href);
      };
    } catch {
      /* some browsers throw if called without permission / in insecure context */
    }
  }

  return { isEnabled, setEnabled, requestPermission, show };
}
