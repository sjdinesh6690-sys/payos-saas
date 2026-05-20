// lib/crypto.js — AES-256-GCM encryption for sensitive fields (SMTP passwords, etc.)
// The encryption key is derived from ENCRYPTION_KEY env var (must be 32 bytes / 64 hex chars).
// Falls back to a key derived from JWT_SECRET so existing deploys keep working.

const crypto = require('crypto');

const ALGO = 'aes-256-gcm';

function getKey() {
  const raw = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET || 'default-key-change-me';
  // Derive a 32-byte key using SHA-256
  return crypto.createHash('sha256').update(raw).digest();
}

/**
 * Encrypt a plaintext string.
 * Returns a single string: hex(iv):hex(authTag):hex(ciphertext)
 */
function encrypt(plaintext) {
  if (!plaintext) return plaintext;
  const key    = getKey();
  const iv     = crypto.randomBytes(12); // 96-bit IV for GCM
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const enc    = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag    = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${enc.toString('hex')}`;
}

/**
 * Decrypt a string produced by encrypt().
 * Returns the original plaintext, or the input unchanged if it doesn't look encrypted.
 */
function decrypt(ciphertext) {
  if (!ciphertext) return ciphertext;
  // If it doesn't match our format, treat it as plaintext (backwards compat)
  const parts = ciphertext.split(':');
  if (parts.length !== 3) return ciphertext;
  try {
    const [ivHex, tagHex, encHex] = parts;
    const key      = getKey();
    const iv       = Buffer.from(ivHex, 'hex');
    const tag      = Buffer.from(tagHex, 'hex');
    const enc      = Buffer.from(encHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(tag);
    return decipher.update(enc) + decipher.final('utf8');
  } catch {
    // Decryption failed — value is probably stored as plaintext (legacy)
    return ciphertext;
  }
}

module.exports = { encrypt, decrypt };
