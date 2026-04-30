import { createHash } from "crypto";
import bcrypt from "bcryptjs";

const BCRYPT_ROUNDS = 12;
const SHA256_HEX_LENGTH = 64;

/**
 * Hash a password with bcrypt (cost factor 12).
 * Returns a string starting with `$2a$` / `$2b$` / `$2y$`.
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/** Legacy SHA-256 hash, kept ONLY to verify old user records. */
function sha256(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

/**
 * Detect the hash format. Existing rows are 64-hex SHA-256;
 * new rows are bcrypt strings (start with `$2`).
 */
function isBcryptHash(stored: string): boolean {
  return stored.startsWith("$2");
}

function isLegacySha256(stored: string): boolean {
  return stored.length === SHA256_HEX_LENGTH && /^[a-f0-9]+$/i.test(stored);
}

/**
 * Verify a password against a stored hash. Supports both bcrypt
 * (preferred) and the legacy SHA-256 format used by older rows.
 */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  if (isBcryptHash(stored)) {
    return bcrypt.compare(password, stored);
  }
  if (isLegacySha256(stored)) {
    return sha256(password) === stored;
  }
  return false;
}

/**
 * Returns true when a stored hash is in the legacy format and
 * should be re-hashed (called after a successful verify).
 */
export function needsRehash(stored: string): boolean {
  return !isBcryptHash(stored);
}
