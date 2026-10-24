/**
 * @file src/lib/security/logger.ts
 *
 * Centralized Redacting Security Logger.
 * Automatically masks sensitive credentials, tokens, passwords, and connection
 * strings before outputting to server diagnostics.
 */

const SENSITIVE_KEY_REGEX = /password|hash|token|secret|cookie|authorization|bearer|database_url|api_key|client_secret/i;

function redactValue(key: string, val: unknown): unknown {
  if (typeof val === "string") {
    if (SENSITIVE_KEY_REGEX.test(key)) {
      return "[REDACTED]";
    }
    // Also check for database connection strings with passwords: postgres://user:pass@host...
    if (val.includes("://") && val.includes("@") && /postgres|mysql|mongodb/i.test(val)) {
      return val.replace(/:([^:@]+)@/, ":[REDACTED]@");
    }
  }

  if (val && typeof val === "object") {
    if (Array.isArray(val)) {
      return val.map((item) => redactValue(key, item));
    }
    const redactedObj: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(val)) {
      redactedObj[k] = redactValue(k, v);
    }
    return redactedObj;
  }

  return val;
}

export const logger = {
  info(message: string, meta?: unknown) {
    if (process.env.NODE_ENV !== "test") {
      console.log(`[SafariX INFO] ${message}`, meta ? redactValue("meta", meta) : "");
    }
  },
  warn(message: string, meta?: unknown) {
    console.warn(`[SafariX WARN] ${message}`, meta ? redactValue("meta", meta) : "");
  },
  error(message: string, err?: unknown) {
    const errorDetails = err instanceof Error ? { message: err.message, stack: process.env.NODE_ENV !== "production" ? err.stack : undefined } : err;
    console.error(`[SafariX ERROR] ${message}`, errorDetails ? redactValue("error", errorDetails) : "");
  },
};
