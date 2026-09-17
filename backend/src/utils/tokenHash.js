import crypto from 'node:crypto';

/**
 * Shared by refresh tokens and password-reset tokens: both hand the user
 * an opaque random string and store only a SHA-256 hash of it. SHA-256
 * (not bcrypt) is deliberate here - these tokens are already
 * high-entropy random values, not human-chosen passwords, so they don't
 * need a slow, salted KDF to resist brute-forcing; a fast deterministic
 * hash is exactly what a "look this token up by its hash" query needs.
 */
export function generateOpaqueToken() {
  return crypto.randomBytes(48).toString('hex');
}

export function hashOpaqueToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}
