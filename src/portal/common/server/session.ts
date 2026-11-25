import type { JWTPayload } from "jose" with { "resolution-mode": "import" };

// `jose` is ESM-only, so it is loaded with a dynamic import (works from this CommonJS build
// under Node, webpack/Turbopack and the Next.js edge runtime).
const loadJose = () => import("jose");

/** Browsers drop cookies larger than ~4KB; stay below that with headroom. */
export const MAX_SESSION_COOKIE_BYTES = 3500;

/** Safe user fields returned to the client (never includes the Knox token). */
export type SessionUserBase = {
  id: string;
  username: string;
  email: string;
  lastName: string;
  otherNames: string;
  language: string;
  phone?: string;
  loginName?: string;
  emailVerified: boolean;
  permissions: string[];
  groups: string[];
};

/** Full server session — `accessToken` stays on the server only. */
export type SessionData<U extends SessionUserBase = SessionUserBase> = {
  accessToken: string;
  accessTokenExpires: number;
  user: U;
};

export type SessionCodecOptions<U extends SessionUserBase> = {
  /** Server secret (`PRIVATE_APP_SECRET`); the AES key is SHA-256 of it. */
  secret: string;
  /** Used in the "cookie too large" error message. */
  cookieName: string;
  /** Fill defaults for fields added after older cookies were issued (e.g. `policyHolders`). */
  normalizeUser?: (user: U) => U;
  /** Override for tests. */
  now?: () => number;
};

export type SessionCodec<U extends SessionUserBase> = {
  seal(session: SessionData<U>): Promise<string>;
  unseal(token: string): Promise<SessionData<U> | null>;
};

/** Expiry as ms epoch from seconds/ms numbers, numeric strings or ISO dates (5 min fallback). */
export function normalizeExpiry(raw: string | number | null | undefined, now = Date.now()): number {
  const fallback = now + 5 * 60 * 1000;

  if (raw == null || raw === "") return fallback;

  if (typeof raw === "number") {
    // Seconds vs milliseconds heuristic
    return raw < 1e12 ? raw * 1000 : raw;
  }

  const asNumber = Number(raw);
  if (!Number.isNaN(asNumber) && asNumber > 0) {
    return asNumber < 1e12 ? asNumber * 1000 : asNumber;
  }

  const parsed = Date.parse(raw);
  return Number.isNaN(parsed) ? fallback : parsed;
}

async function deriveKey(secret: string): Promise<Uint8Array> {
  const digest = await globalThis.crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(secret),
  );
  return new Uint8Array(digest);
}

/**
 * Encrypted-JWT session cookie codec (`dir` + `A256GCM`). Uses Web Crypto only, so it runs in
 * Node route handlers and the Next.js edge middleware alike.
 */
export function createSessionCodec<U extends SessionUserBase = SessionUserBase>(
  options: SessionCodecOptions<U>,
): SessionCodec<U> {
  const now = options.now ?? Date.now;
  let keyPromise: Promise<Uint8Array> | null = null;
  const key = () => (keyPromise ??= deriveKey(options.secret));

  return {
    async seal(session) {
      const { EncryptJWT } = await loadJose();
      const sealed = await new EncryptJWT({
        accessToken: session.accessToken,
        accessTokenExpires: session.accessTokenExpires,
        user: session.user,
      } satisfies SessionData<U> as unknown as JWTPayload)
        .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
        .setIssuedAt()
        .setExpirationTime(Math.floor(session.accessTokenExpires / 1000))
        .encrypt(await key());

      if (new TextEncoder().encode(sealed).length > MAX_SESSION_COOKIE_BYTES) {
        throw new Error(
          `Cookie "${options.cookieName}" is too large, and will be discarded by the browser`,
        );
      }
      return sealed;
    },

    async unseal(token) {
      try {
        const { jwtDecrypt } = await loadJose();
        const { payload } = await jwtDecrypt(token, await key(), { currentDate: new Date(now()) });
        const data = payload as unknown as SessionData<U>;

        if (
          typeof data.accessToken !== "string" ||
          typeof data.accessTokenExpires !== "number" ||
          !data.user ||
          typeof data.user !== "object"
        ) {
          return null;
        }
        if (data.accessTokenExpires < now()) return null;

        const user = {
          ...data.user,
          emailVerified: data.user.emailVerified ?? true,
          permissions: data.user.permissions ?? [],
          groups: data.user.groups ?? [],
        } as U;
        return {
          accessToken: data.accessToken,
          accessTokenExpires: data.accessTokenExpires,
          user: options.normalizeUser ? options.normalizeUser(user) : user,
        };
      } catch {
        return null;
      }
    },
  };
}

export type SessionCookieOptions = {
  path: string;
  httpOnly: true;
  secure: boolean;
  sameSite: "lax";
  expires: Date;
};

/** Cookie attributes for the sealed session (`secure` defaults to production only). */
export function sessionCookieOptions(
  expiresAt: number,
  secure: boolean = (globalThis as { process?: { env?: Record<string, string | undefined> } })
    .process?.env?.NODE_ENV === "production",
): SessionCookieOptions {
  return { path: "/", httpOnly: true, secure, sameSite: "lax", expires: new Date(expiresAt) };
}
