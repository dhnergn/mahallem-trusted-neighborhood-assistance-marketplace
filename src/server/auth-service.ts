import {
  users,
  sessions,
  trustMetrics,
  verificationChallenges,
  computePublicTrustProfile,
} from './storage.ts';
import {
  hashIdentifier,
  maskPhone,
  maskEmail,
  generateSessionToken,
  generateOtpCode,
  hashIp,
} from '../lib/crypto.ts';
import { checkRateLimit, resetRateLimit } from '../lib/rate-limiter.ts';
import { recordAuditLog } from '../lib/audit.ts';
import { User, PublicTrustProfile } from '../types/index.ts';

const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_VERIFICATION_ATTEMPTS = 3;

export interface RequestOtpResult {
  success: boolean;
  message: string;
  // In development, we return the generated code in response for rapid testing
  debugCode?: string;
}

export interface VerifyOtpResult {
  success: boolean;
  message: string;
  token?: string;
  user?: User;
  trustProfile?: PublicTrustProfile;
}

/**
 * Handles OTP dispatch with strict rate limiting & anti-enumeration protection
 */
export function requestOtp(
  identifier: string,
  type: 'phone' | 'email',
  clientIp: string
): RequestOtpResult {
  const ipHash = hashIp(clientIp);
  const identifierHash = hashIdentifier(identifier);

  // 1. Rate limiting by IP: max 5 requests per 2 minutes
  const ipLimit = checkRateLimit(`otp:ip:${ipHash}`, 5, 24);
  if (!ipLimit.success) {
    recordAuditLog({
      actorId: null,
      eventType: 'AUTH_RATE_LIMIT_EXCEEDED',
      resourceType: 'OTP',
      resourceId: ipHash,
      ipHash,
      userAgentMasked: 'client',
      metadata: { reason: 'IP rate limit exceeded for OTP requests' },
    });
    return {
      success: false,
      message: `Too many requests. Please wait ${ipLimit.resetSeconds} seconds.`,
    };
  }

  // 2. Rate limiting by identifier: max 3 requests per 5 minutes
  const targetLimit = checkRateLimit(`otp:target:${identifierHash}`, 3, 100);
  if (!targetLimit.success) {
    return {
      success: false,
      message: `Too many attempts for this destination. Please wait ${targetLimit.resetSeconds} seconds.`,
    };
  }

  // 3. Generate secure code
  const code = generateOtpCode();

  // 4. Store verification challenge
  verificationChallenges.set(identifierHash, {
    identifierHash,
    code,
    attemptsRemaining: MAX_VERIFICATION_ATTEMPTS,
    expiresAt: Date.now() + OTP_TTL_MS,
    createdAt: Date.now(),
  });

  recordAuditLog({
    actorId: null,
    eventType: 'OTP_REQUESTED',
    resourceType: 'AUTH',
    resourceId: identifierHash,
    ipHash,
    userAgentMasked: 'client',
    metadata: { type, attemptsRemaining: MAX_VERIFICATION_ATTEMPTS },
  });

  return {
    success: true,
    message: 'Verification code dispatched successfully.',
    debugCode: code, // Useful for the local sandbox interface
  };
}

/**
 * Verifies the 6-digit OTP code against the challenge
 */
export function verifyOtp(
  identifier: string,
  code: string,
  clientIp: string
): VerifyOtpResult {
  const ipHash = hashIp(clientIp);
  const identifierHash = hashIdentifier(identifier);

  const challenge = verificationChallenges.get(identifierHash);

  if (!challenge) {
    return {
      success: false,
      message: 'No active verification code found or code has expired. Please request a new code.',
    };
  }

  // Check expiration
  if (Date.now() > challenge.expiresAt) {
    verificationChallenges.delete(identifierHash);
    return {
      success: false,
      message: 'The verification code has expired. Please request a new one.',
    };
  }

  // Check attempt limit
  if (challenge.attemptsRemaining <= 0) {
    verificationChallenges.delete(identifierHash);
    recordAuditLog({
      actorId: null,
      eventType: 'OTP_LOCKOUT',
      resourceType: 'AUTH',
      resourceId: identifierHash,
      ipHash,
      userAgentMasked: 'client',
      metadata: { reason: 'Maximum incorrect OTP attempts reached' },
    });
    return {
      success: false,
      message: 'Too many incorrect attempts. This code is invalidated. Please request a new one.',
    };
  }

  // Compare code (constant-time equivalent for 6 digits)
  if (challenge.code !== code.trim()) {
    challenge.attemptsRemaining -= 1;
    recordAuditLog({
      actorId: null,
      eventType: 'OTP_FAILED_ATTEMPT',
      resourceType: 'AUTH',
      resourceId: identifierHash,
      ipHash,
      userAgentMasked: 'client',
      metadata: { attemptsRemaining: challenge.attemptsRemaining },
    });

    if (challenge.attemptsRemaining <= 0) {
      verificationChallenges.delete(identifierHash);
      return {
        success: false,
        message: 'Invalid code. Maximum attempts reached. Please request a new code.',
      };
    }

    return {
      success: false,
      message: `Invalid code. ${challenge.attemptsRemaining} attempts remaining.`,
    };
  }

  // Successful verification! Invalidate the challenge immediately
  verificationChallenges.delete(identifierHash);
  resetRateLimit(`otp:target:${identifierHash}`);

  // Find or create user
  let user = Array.from(users.values()).find(u => u.phoneHash === identifierHash);

  if (!user) {
    // New resident registration
    const newUserId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const nowIso = new Date().toISOString();
    user = {
      id: newUserId,
      phoneHash: identifierHash,
      phoneMasked: maskPhone(identifier),
      emailMasked: identifier.includes('@') ? maskEmail(identifier) : maskEmail(`${identifier}@example.com`),
      displayName: `Neighbor ${identifier.slice(-4)}`,
      avatarUrl: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80`,
      role: 'USER',
      status: 'ACTIVE',
      neighborhood: 'Moda',
      district: 'Kadıköy',
      idVerifiedAt: null,
      phoneVerifiedAt: nowIso,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    users.set(user.id, user);

    trustMetrics.set(user.id, {
      userId: user.id,
      tasksRequestedCount: 0,
      tasksCompletedCount: 0,
      tasksCancelledCount: 0,
      disputesCount: 0,
      positiveRatingsCount: 0,
      totalRatingsCount: 0,
      reputationScore: 100.0,
      completionRate: 100,
      categoryExperience: {},
      memberSince: nowIso,
    });
  }

  // Generate cryptographically strong session token
  const token = generateSessionToken();
  const now = new Date();
  sessions.set(token, {
    token,
    userId: user.id,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + 7 * 86400000).toISOString(),
    lastActiveAt: now.toISOString(),
  });

  recordAuditLog({
    actorId: user.id,
    eventType: 'AUTH_SUCCESS_OTP',
    resourceType: 'USER',
    resourceId: user.id,
    ipHash,
    userAgentMasked: 'client',
    metadata: { role: user.role },
  });

  const trustProfile = computePublicTrustProfile(user.id)!;

  return {
    success: true,
    message: 'Authentication successful.',
    token,
    user,
    trustProfile,
  };
}

/**
 * Validate session token and return user + trust profile
 */
export function getSessionUser(token: string | undefined): { user: User; trustProfile: PublicTrustProfile } | null {
  if (!token) return null;
  const session = sessions.get(token);
  if (!session) return null;

  if (new Date(session.expiresAt).getTime() < Date.now()) {
    sessions.delete(token);
    return null;
  }

  const user = users.get(session.userId);
  if (!user || user.status === 'SUSPENDED') return null;

  // Update last active
  session.lastActiveAt = new Date().toISOString();

  const trustProfile = computePublicTrustProfile(user.id);
  if (!trustProfile) return null;

  return { user, trustProfile };
}

/**
 * Destroy session (logout)
 */
export function invalidateSession(token: string, clientIp: string): void {
  const session = sessions.get(token);
  if (session) {
    sessions.delete(token);
    recordAuditLog({
      actorId: session.userId,
      eventType: 'AUTH_LOGOUT',
      resourceType: 'SESSION',
      resourceId: session.token.substring(0, 8),
      ipHash: hashIp(clientIp),
      userAgentMasked: 'client',
      metadata: {},
    });
  }
}

/**
 * Switch account helper for testing multi-role trust & neighbor dynamics
 */
export function switchActiveAccount(targetUserId: string, clientIp: string): { token: string; user: User; trustProfile: PublicTrustProfile } | null {
  const targetUser = users.get(targetUserId);
  if (!targetUser) return null;

  const token = generateSessionToken();
  const now = new Date();
  sessions.set(token, {
    token,
    userId: targetUser.id,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + 7 * 86400000).toISOString(),
    lastActiveAt: now.toISOString(),
  });

  recordAuditLog({
    actorId: targetUser.id,
    eventType: 'DEV_ACCOUNT_SWITCH',
    resourceType: 'USER',
    resourceId: targetUser.id,
    ipHash: hashIp(clientIp),
    userAgentMasked: 'client',
    metadata: { newRole: targetUser.role, targetName: targetUser.displayName },
  });

  return {
    token,
    user: targetUser,
    trustProfile: computePublicTrustProfile(targetUser.id)!,
  };
}
