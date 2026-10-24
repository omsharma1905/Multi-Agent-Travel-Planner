/**
 * @file src/lib/auth/passwords.ts
 *
 * Production-grade server-side password hashing and verification using bcrypt.
 * Enforces secure cost factor (12) and password policy validation.
 * Never executes on the client.
 */

import bcrypt from "bcryptjs";

const BCRYPT_SALT_ROUNDS = 12;

export interface PasswordValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates password strength policy.
 * Requires at least 8 characters and no more than 100 characters.
 */
export function validatePasswordPolicy(password: string): PasswordValidationResult {
  if (!password || typeof password !== "string") {
    return { valid: false, error: "Password is required." };
  }
  if (password.length < 8) {
    return { valid: false, error: "Password must be at least 8 characters long." };
  }
  if (password.length > 100) {
    return { valid: false, error: "Password cannot exceed 100 characters." };
  }
  return { valid: true };
}

/**
 * Generates a salted bcrypt hash of the provided plaintext password.
 */
export async function hashPassword(password: string): Promise<string> {
  const check = validatePasswordPolicy(password);
  if (!check.valid) {
    throw new Error(check.error || "Password does not satisfy policy requirements.");
  }
  return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
}

/**
 * Verifies a plaintext password against a stored bcrypt hash.
 * Timing-safe comparison.
 */
export async function verifyPassword(password: string, hash?: string | null): Promise<boolean> {
  if (!password || !hash) {
    return false;
  }
  try {
    return await bcrypt.compare(password, hash);
  } catch {
    return false;
  }
}
