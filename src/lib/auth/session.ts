/**
 * @file src/lib/auth/session.ts
 *
 * Cryptographically signed server-side session management.
 * Generates and validates tamper-proof session tokens backed by HMAC-SHA256
 * and sets strict HttpOnly, Secure, SameSite=Lax session cookies.
 *
 * Implemented using the standard Web Crypto API (globalThis.crypto.subtle)
 * so that it executes safely and identically across both Edge Runtime
 * (Next.js Middleware / Proxy) and Node.js environments without native
 * Node.js 'crypto' module incompatibilities.
 */

export const SESSION_COOKIE_NAME = "safarix_session";
export const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 7 days

export interface SessionPayload {
  userId: string;
  email: string;
  issuedAt: number;
  expiresAt: number;
  nonce: string;
}

function getSessionSecret(): string {
  const isProduction = process.env.NODE_ENV === "production";
  if (isProduction) {
    if (process.env.ALLOW_DEMO_AUTH === "true") {
      throw new Error(
        "SECURITY_CONFIGURATION_ERROR: ALLOW_DEMO_AUTH is strictly forbidden in production environment.",
      );
    }
    const secret = process.env.SESSION_SECRET || process.env.NEXTAUTH_SECRET;
    if (!secret || secret.length < 32) {
      throw new Error(
        "SECURITY_CONFIGURATION_ERROR: SESSION_SECRET or NEXTAUTH_SECRET (minimum 32 characters) must be configured in production environment.",
      );
    }
    return secret;
  }

  const secret = process.env.SESSION_SECRET || process.env.NEXTAUTH_SECRET;
  if (secret && secret.length >= 32) {
    return secret;
  }
  return "safarix-production-hmac-sha256-signing-secret-key-must-be-at-least-32-bytes";
}

function base64UrlEncode(data: string): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(data, "utf8").toString("base64url");
  }
  return btoa(unescape(encodeURIComponent(data)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64UrlDecode(data: string): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(data, "base64url").toString("utf8");
  }
  let base64 = data.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  return decodeURIComponent(escape(atob(base64)));
}

function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function computeSignature(payloadB64: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payloadB64));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Creates a cryptographically signed session token string using HMAC-SHA256.
 */
export async function createSessionToken(userId: string, email: string): Promise<string> {
  const now = Date.now();
  const payload: SessionPayload = {
    userId,
    email: email.trim().toLowerCase(),
    issuedAt: now,
    expiresAt: now + SESSION_MAX_AGE_SECONDS * 1000,
    nonce: generateNonce(),
  };

  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  const signature = await computeSignature(payloadB64, getSessionSecret());

  return `${payloadB64}.${signature}`;
}

/**
 * Validates a signed session token.
 * Returns decoded SessionPayload if valid and not expired; otherwise null.
 */
export async function verifySessionToken(token?: string | null): Promise<SessionPayload | null> {
  if (!token || typeof token !== "string") {
    return null;
  }

  const parts = token.split(".");
  if (parts.length !== 2) {
    return null;
  }

  const [payloadB64, signature] = parts;
  if (!payloadB64 || !signature) {
    return null;
  }

  // Strict format check: HMAC-SHA256 hex digest is exactly 64 hexadecimal characters
  if (signature.length !== 64 || !/^[0-9a-f]{64}$/i.test(signature)) {
    return null;
  }

  try {
    const expectedSignature = await computeSignature(payloadB64, getSessionSecret());

    if (!timingSafeEqual(signature.toLowerCase(), expectedSignature.toLowerCase())) {
      return null;
    }

    const jsonStr = base64UrlDecode(payloadB64);
    const payload = JSON.parse(jsonStr) as SessionPayload;

    if (!payload.userId || !payload.expiresAt) {
      return null;
    }

    if (Date.now() > payload.expiresAt) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Returns cookie options for setting the authenticated session cookie.
 */
export function getSessionCookieOptions(): {
  name: string;
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax";
  path: string;
  maxAge: number;
} {
  return {
    name: SESSION_COOKIE_NAME,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}
