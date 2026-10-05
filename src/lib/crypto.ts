import { createHash, randomBytes } from 'crypto';

const PEPPER_SALT = process.env.AUTH_SALT || 'mahallem_secure_auth_salt_v1';

/**
 * Creates an irreversible HMAC/SHA-256 hash of an identifier (e.g. phone or email)
 * to allow exact lookup without storing plaintext PII in raw searchable form.
 */
export function hashIdentifier(identifier: string): string {
  const normalized = identifier.trim().toLowerCase().replace(/[\s\-\(\)]/g, '');
  return createHash('sha256').update(`${PEPPER_SALT}:${normalized}`).digest('hex');
}

/**
 * Masks phone numbers to protect user privacy (e.g. +90 532 123 4567 -> +90 ••• ••• 4567)
 */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 7) return '••••••';
  const lastFour = digits.slice(-4);
  const countryPrefix = phone.startsWith('+') ? phone.slice(0, 3) : '+90';
  return `${countryPrefix} ••• ••• ${lastFour}`;
}

/**
 * Masks email addresses for privacy (e.g. user.name@example.com -> u••••e@example.com)
 */
export function maskEmail(email: string): string {
  const parts = email.split('@');
  if (parts.length !== 2) return '•••••@••••.com';
  const name = parts[0];
  const domain = parts[1];
  if (name.length <= 2) {
    return `${name[0]}•@${domain}`;
  }
  return `${name[0]}••••${name[name.length - 1]}@${domain}`;
}

/**
 * Generates a cryptographically strong 256-bit session token.
 */
export function generateSessionToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Generates a 6-digit numeric OTP.
 */
export function generateOtpCode(): string {
  // Use crypto random bytes modulo 1000000
  const buffer = randomBytes(4);
  const num = buffer.readUInt32BE(0) % 1000000;
  return num.toString().padStart(6, '0');
}

/**
 * Hashes an IP address to preserve privacy while supporting rate-limiting and audit trails.
 */
export function hashIp(ip: string): string {
  return createHash('sha256').update(`ip:${PEPPER_SALT}:${ip}`).digest('hex').substring(0, 16);
}
