import { Router, Request, Response, NextFunction } from 'express';
import {
  RequestOtpSchema,
  VerifyOtpSchema,
  SwitchAccountSchema,
  CreateTaskSchema,
  SubmitOfferSchema,
  TransitionTaskSchema,
  VerifyHandoverOtpSchema,
  SendMessageSchema,
  SubmitReportSchema,
  BlockUserSchema,
  SubmitReviewSchema,
} from '../types/index.ts';
import {
  requestOtp,
  verifyOtp,
  getSessionUser,
  invalidateSession,
  switchActiveAccount,
} from './auth-service.ts';
import {
  computePublicTrustProfile,
  users,
  createTaskInStorage,
  getTasksForDiscovery,
  getTaskById,
  submitTaskOffer,
  getTaskOffers,
  acceptTaskOffer,
  transitionTaskState,
  verifyHandoverOtp,
  getUserTasks,
  getTaskConversation,
  sendTaskMessage,
  submitUserReport,
  blockUser,
  getBlockedUsers,
  submitTaskReview,
  getTaskReviewStatus,
  getUserRevealedReviews,
  purgeTaskPrivacyData,
} from './storage.ts';
import { getRecentAuditLogs, recordAuditLog } from '../lib/audit.ts';
import { checkRateLimit } from '../lib/rate-limiter.ts';
import { TASK_CATEGORIES } from '../lib/task-policy.ts';
import { ISTANBUL_NEIGHBORHOODS } from '../lib/geo.ts';
import { moderateTaskSubmission } from '../lib/ai-moderation.ts';
import { hashIp } from '../lib/crypto.ts';

export const apiRouter = Router();

// Middleware: Extract Bearer token or cookie from request
export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  let token: string | undefined;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (req.headers['x-session-token']) {
    token = req.headers['x-session-token'] as string;
  }

  if (token) {
    const sessionData = getSessionUser(token);
    if (sessionData) {
      (req as any).user = sessionData.user;
      (req as any).trustProfile = sessionData.trustProfile;
      (req as any).token = token;
    }
  }

  next();
}

// Middleware: Require valid authenticated session
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!(req as any).user) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required. Please sign in.',
      },
    });
  }
  next();
}

// ==========================================
// AUTHENTICATION ENDPOINTS
// ==========================================

// 1. Request verification OTP
apiRouter.post('/auth/request-otp', (req: Request, res: Response) => {
  const parseResult = RequestOtpSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input parameters',
        details: parseResult.error.format(),
      },
    });
  }

  const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';
  const result = requestOtp(parseResult.data.identifier, parseResult.data.type, clientIp);

  if (!result.success) {
    return res.status(429).json({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: result.message,
      },
    });
  }

  return res.json({
    success: true,
    message: result.message,
    debugCode: result.debugCode,
  });
});

// 2. Verify OTP & establish session
apiRouter.post('/auth/verify-otp', (req: Request, res: Response) => {
  const parseResult = VerifyOtpSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid code or identifier format',
        details: parseResult.error.format(),
      },
    });
  }

  const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';
  const result = verifyOtp(parseResult.data.identifier, parseResult.data.code, clientIp);

  if (!result.success) {
    return res.status(400).json({
      error: {
        code: 'VERIFICATION_FAILED',
        message: result.message,
      },
    });
  }

  return res.json({
    success: true,
    token: result.token,
    user: result.user,
    trustProfile: result.trustProfile,
  });
});

// 3. Current active user & trust profile
apiRouter.get('/auth/me', (req: Request, res: Response) => {
  const user = (req as any).user;
  const trustProfile = (req as any).trustProfile;

  if (!user) {
    return res.json({
      authenticated: false,
      user: null,
      trustProfile: null,
    });
  }

  return res.json({
    authenticated: true,
    user,
    trustProfile,
  });
});

// 4. Logout
apiRouter.post('/auth/logout', (req: Request, res: Response) => {
  const token = (req as any).token;
  const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';

  if (token) {
    invalidateSession(token, clientIp);
  }

  return res.json({ success: true, message: 'Logged out successfully' });
});

// 5. Switch active demo account (multi-neighbor testing)
apiRouter.post('/auth/switch-account', (req: Request, res: Response) => {
  const parseResult = SwitchAccountSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid target user ID',
      },
    });
  }

  const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';
  const result = switchActiveAccount(parseResult.data.targetUserId, clientIp);

  if (!result) {
    return res.status(404).json({
      error: {
        code: 'USER_NOT_FOUND',
        message: 'Requested neighbor account does not exist',
      },
    });
  }

  return res.json({
    success: true,
    token: result.token,
    user: result.user,
    trustProfile: result.trustProfile,
  });
});

// ==========================================
// USER & TRUST ENDPOINTS
// ==========================================

// List neighborhood accounts for demo switching & discovery testing
apiRouter.get('/users/neighbors', (_req: Request, res: Response) => {
  const publicList = Array.from(users.values()).map(u => ({
    id: u.id,
    displayName: u.displayName,
    avatarUrl: u.avatarUrl,
    role: u.role,
    neighborhood: u.neighborhood,
    district: u.district,
    isIdVerified: !!u.idVerifiedAt,
  }));

  return res.json({ neighbors: publicList });
});

// Public trust profile (strictly sanitized, no internal risk scores)
apiRouter.get('/users/:id/trust-profile', (req: Request, res: Response) => {
  const profile = computePublicTrustProfile(req.params.id);
  if (!profile) {
    return res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: 'Neighbor profile not found',
      },
    });
  }

  return res.json({ trustProfile: profile });
});

// Security audit log stream
apiRouter.get('/audit-logs', (_req: Request, res: Response) => {
  const logs = getRecentAuditLogs(40);
  return res.json({ logs });
});

// ==========================================
// TASK & DISCOVERY ENDPOINTS (PHASE 3)
// ==========================================

// 1. Get task categories and policy classifications
apiRouter.get('/categories', (_req: Request, res: Response) => {
  return res.json({ categories: TASK_CATEGORIES });
});

// 2. Get neighborhood centroids
apiRouter.get('/neighborhoods', (_req: Request, res: Response) => {
  return res.json({ neighborhoods: ISTANBUL_NEIGHBORHOODS });
});

// 3. Create a new task (Auth Required + Rate Limited + Safety Screened)
apiRouter.post('/tasks', requireAuth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';
  const ipHash = hashIp(clientIp);

  // Rate Limiting: Max 5 task creations per 15 minutes per user
  const limitCheck = checkRateLimit(`task_create:${user.id}`, 5, 180);
  if (!limitCheck.success) {
    recordAuditLog({
      actorId: user.id,
      eventType: 'TASK_RATE_LIMIT_EXCEEDED',
      resourceType: 'TASK',
      resourceId: user.id,
      ipHash,
      userAgentMasked: 'client',
      metadata: { resetSeconds: limitCheck.resetSeconds },
    });

    return res.status(429).json({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: `Task creation velocity limit reached. Please wait ${limitCheck.resetSeconds} seconds before posting another request.`,
      },
    });
  }

  // Zod Input Validation
  const parseResult = CreateTaskSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid task parameters',
        details: parseResult.error.format(),
      },
    });
  }

  const {
    categoryId,
    title,
    description,
    neighborhoodKey,
    destinationDistrict,
    destinationNeighborhood,
    pickupAddressSensitive,
    rewardLira,
    estimatedMinutes,
    openInspectionAgreed,
  } = parseResult.data;

  // AI & Deterministic Multi-Layer Safety Screening
  const screening = await moderateTaskSubmission(categoryId, title, description);

  if (!screening.allowed) {
    recordAuditLog({
      actorId: user.id,
      eventType: 'TASK_CREATION_REJECTED',
      resourceType: 'TASK',
      resourceId: categoryId,
      ipHash,
      userAgentMasked: 'client',
      metadata: {
        reason: screening.reason,
        source: screening.source,
        title,
      },
    });

    return res.status(400).json({
      error: {
        code: 'SAFETY_POLICY_VIOLATION',
        message: screening.reason || 'This task does not meet neighborhood safety guidelines.',
        source: screening.source,
      },
    });
  }

  // Safe to persist
  const newTask = createTaskInStorage(user.id, {
    categoryId,
    title,
    description,
    neighborhoodKey,
    destinationDistrict,
    destinationNeighborhood,
    pickupAddressSensitive,
    rewardCents: Math.round(rewardLira * 100),
    estimatedMinutes,
    openInspectionAgreed,
    moderationSource: screening.source,
  });

  recordAuditLog({
    actorId: user.id,
    eventType: 'TASK_CREATED',
    resourceType: 'TASK',
    resourceId: newTask.id,
    ipHash,
    userAgentMasked: 'client',
    metadata: {
      categoryId,
      neighborhoodKey,
      rewardCents: newTask.rewardCents,
      moderationSource: screening.source,
    },
  });

  return res.status(201).json({
    success: true,
    message: 'Neighborhood task published successfully.',
    task: newTask,
  });
});

// 4. Discover nearby tasks (Proximity Filtered & Coarse Sanitized)
apiRouter.get('/tasks', (req: Request, res: Response) => {
  const lat = req.query.lat ? parseFloat(req.query.lat as string) : 40.9833;
  const lng = req.query.lng ? parseFloat(req.query.lng as string) : 29.0267;
  const category = req.query.category as string | undefined;
  const district = req.query.district as string | undefined;
  const maxDistanceKm = req.query.radius ? parseFloat(req.query.radius as string) : undefined;

  const discoveryCards = getTasksForDiscovery(
    { lat, lng },
    {
      category: category === 'all' ? undefined : category,
      district: district === 'all' ? undefined : district,
      maxDistanceKm,
    }
  );

  return res.json({ tasks: discoveryCards, count: discoveryCards.length });
});

// 5. Get task details (IDOR/BOLA Guarded)
apiRouter.get('/tasks/:id', (req: Request, res: Response) => {
  const currentUserId = (req as any).user?.id;
  const result = getTaskById(req.params.id, currentUserId);

  if (!result) {
    return res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: 'Task not found or has expired.',
      },
    });
  }

  return res.json({
    task: result.task,
    canViewExactDetails: result.canViewExactDetails,
  });
});

// ==========================================
// OFFERS & MATCHING ENDPOINTS (PHASE 4)
// ==========================================

// 6. Submit an offer to help on a task
apiRouter.post('/tasks/:id/offers', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user;
  const taskId = req.params.id;

  const parseResult = SubmitOfferSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid offer parameters',
        details: parseResult.error.format(),
      },
    });
  }

  const result = submitTaskOffer(
    taskId,
    user.id,
    parseResult.data.message,
    parseResult.data.estimatedArrivalMinutes
  );

  if (!result.success) {
    return res.status(400).json({
      error: {
        code: 'OFFER_REJECTED',
        message: result.error,
      },
    });
  }

  recordAuditLog({
    actorId: user.id,
    eventType: 'OFFER_SUBMITTED',
    resourceType: 'TASK',
    resourceId: taskId,
    ipHash: hashIp(req.ip || '127.0.0.1'),
    userAgentMasked: 'client',
    metadata: { offerId: result.offer?.id },
  });

  return res.status(201).json({
    success: true,
    message: 'Offer submitted to neighbor.',
    offer: result.offer,
  });
});

// 7. Get offers for a task (Requester only)
apiRouter.get('/tasks/:id/offers', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user;
  const taskId = req.params.id;

  const offersList = getTaskOffers(taskId, user.id);
  if (offersList === null) {
    return res.status(403).json({
      error: {
        code: 'FORBIDDEN',
        message: 'Only the task requester can view incoming helper offers.',
      },
    });
  }

  return res.json({ offers: offersList });
});

// 8. Accept an offer & transition task to ACCEPTED
apiRouter.post('/tasks/:id/offers/:offerId/accept', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user;
  const { id: taskId, offerId } = req.params;

  const result = acceptTaskOffer(taskId, offerId, user.id);
  if (!result.success) {
    return res.status(400).json({
      error: {
        code: 'ACCEPT_FAILED',
        message: result.error,
      },
    });
  }

  recordAuditLog({
    actorId: user.id,
    eventType: 'OFFER_ACCEPTED',
    resourceType: 'TASK',
    resourceId: taskId,
    ipHash: hashIp(req.ip || '127.0.0.1'),
    userAgentMasked: 'client',
    metadata: {
      acceptedOfferId: offerId,
      acceptedHelperId: result.task?.acceptedHelperId,
    },
  });

  return res.json({
    success: true,
    message: 'Offer accepted! Task is now officially agreed. Completion OTP generated.',
    task: result.task,
    completionOtp: result.completionOtp,
  });
});

// 9. Transition task state (e.g. IN_PROGRESS, CANCELLED)
apiRouter.post('/tasks/:id/transition', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user;
  const taskId = req.params.id;

  const parseResult = TransitionTaskSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid transition parameters',
      },
    });
  }

  const result = transitionTaskState(
    taskId,
    parseResult.data.targetStatus,
    { userId: user.id, role: user.role },
    parseResult.data.reason
  );

  if (!result.success) {
    return res.status(400).json({
      error: {
        code: 'INVALID_TRANSITION',
        message: result.error,
      },
    });
  }

  recordAuditLog({
    actorId: user.id,
    eventType: 'TASK_STATE_TRANSITION',
    resourceType: 'TASK',
    resourceId: taskId,
    ipHash: hashIp(req.ip || '127.0.0.1'),
    userAgentMasked: 'client',
    metadata: {
      newStatus: parseResult.data.targetStatus,
      reason: parseResult.data.reason,
    },
  });

  return res.json({
    success: true,
    message: `Task successfully transitioned to ${parseResult.data.targetStatus}.`,
    task: result.task,
  });
});

// 10. Complete Handover: Helper submits the 6-digit physical OTP
apiRouter.post('/tasks/:id/complete-handover', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user;
  const taskId = req.params.id;

  const parseResult = VerifyHandoverOtpSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid code format. Must be a 6-digit numeric OTP.',
      },
    });
  }

  const result = verifyHandoverOtp(taskId, user.id, parseResult.data.otpCode);
  if (!result.success) {
    recordAuditLog({
      actorId: user.id,
      eventType: 'HANDOVER_OTP_FAILED',
      resourceType: 'TASK',
      resourceId: taskId,
      ipHash: hashIp(req.ip || '127.0.0.1'),
      userAgentMasked: 'client',
      metadata: { error: result.error },
    });

    return res.status(400).json({
      error: {
        code: 'HANDOVER_VERIFICATION_FAILED',
        message: result.error,
      },
    });
  }

  recordAuditLog({
    actorId: user.id,
    eventType: 'TASK_COMPLETED',
    resourceType: 'TASK',
    resourceId: taskId,
    ipHash: hashIp(req.ip || '127.0.0.1'),
    userAgentMasked: 'client',
    metadata: {
      completedByHelperId: user.id,
      rewardCents: result.task?.rewardCents,
    },
  });

  return res.json({
    success: true,
    message: 'Handover code confirmed! Task marked as COMPLETED. Trust reputation updated.',
    task: result.task,
  });
});

// 11. My Tasks (Requested & Helping)
apiRouter.get('/my-tasks', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user;
  const userTasks = getUserTasks(user.id);
  return res.json(userTasks);
});

// ==========================================
// EPHEMERAL CHAT ENDPOINTS (PHASE 5)
// ==========================================

// 12. Get task conversation & messages (BOLA Guarded)
apiRouter.get('/tasks/:id/conversation', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user;
  const taskId = req.params.id;

  const result = getTaskConversation(taskId, user.id);
  if (!result.success) {
    return res.status(403).json({
      error: {
        code: 'FORBIDDEN_CONVERSATION',
        message: result.error,
      },
    });
  }

  return res.json({ conversation: result.conversation });
});

// 13. Send ephemeral chat message (BOLA Guarded + Leak Shielded)
apiRouter.post('/tasks/:id/messages', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user;
  const taskId = req.params.id;

  const parseResult = SendMessageSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid message content',
      },
    });
  }

  // Rate Limiting: Max 20 messages per minute
  const limitCheck = checkRateLimit(`chat_msg:${user.id}`, 20, 3);
  if (!limitCheck.success) {
    return res.status(429).json({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Message rate limit exceeded. Please wait a moment.',
      },
    });
  }

  const result = sendTaskMessage(taskId, user.id, parseResult.data.content);
  if (!result.success) {
    return res.status(403).json({
      error: {
        code: 'MESSAGE_SEND_FAILED',
        message: result.error,
      },
    });
  }

  if (result.message?.hasShieldedContent) {
    recordAuditLog({
      actorId: user.id,
      eventType: 'CHAT_LEAK_SHIELD_TRIGGERED',
      resourceType: 'MESSAGE',
      resourceId: result.message.id,
      ipHash: hashIp(req.ip || '127.0.0.1'),
      userAgentMasked: 'client',
      metadata: {
        reasons: result.message.flaggedReasons,
        taskId,
      },
    });
  }

  return res.status(201).json({
    success: true,
    message: result.message,
  });
});

// ==========================================
// MODERATION, REPORTING & BLOCKING (PHASE 5)
// ==========================================

// 14. Submit safety / abuse report
apiRouter.post('/reports', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user;

  const parseResult = SubmitReportSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid report parameters',
      },
    });
  }

  const report = submitUserReport(user.id, parseResult.data);

  recordAuditLog({
    actorId: user.id,
    eventType: 'USER_REPORT_SUBMITTED',
    resourceType: 'REPORT',
    resourceId: report.id,
    ipHash: hashIp(req.ip || '127.0.0.1'),
    userAgentMasked: 'client',
    metadata: {
      category: report.category,
      reportedUserId: report.reportedUserId,
      reportedTaskId: report.reportedTaskId,
    },
  });

  return res.status(201).json({
    success: true,
    message: 'Report submitted. Our neighborhood safety moderation team will investigate.',
    reportId: report.id,
  });
});

// 15. Block user
apiRouter.post('/users/:id/block', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user;
  const targetUserId = req.params.id;

  const parseResult = BlockUserSchema.safeParse({
    blockedUserId: targetUserId,
    reason: req.body?.reason,
  });

  if (!parseResult.success) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid block parameters',
      },
    });
  }

  const result = blockUser(user.id, targetUserId, parseResult.data.reason);
  if (!result.success) {
    return res.status(400).json({
      error: {
        code: 'BLOCK_FAILED',
        message: result.error,
      },
    });
  }

  recordAuditLog({
    actorId: user.id,
    eventType: 'USER_BLOCKED',
    resourceType: 'USER',
    resourceId: targetUserId,
    ipHash: hashIp(req.ip || '127.0.0.1'),
    userAgentMasked: 'client',
    metadata: { reason: parseResult.data.reason },
  });

  return res.json({
    success: true,
    message: `Neighbor has been blocked. They can no longer message you or view your offers.`,
    block: result.block,
  });
});

// 16. Get list of blocked users
apiRouter.get('/users/blocked', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user;
  const blockedList = getBlockedUsers(user.id);
  return res.json({ blockedUsers: blockedList });
});

// ==========================================
// DOUBLE-BLIND REVIEWS & REPUTATION (PHASE 6)
// ==========================================

// 17. Submit double-blind review
apiRouter.post('/tasks/:id/reviews', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user;
  const taskId = req.params.id;

  const parseResult = SubmitReviewSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: parseResult.error.issues?.[0]?.message || 'Invalid review data.',
      },
    });
  }

  const result = submitTaskReview(taskId, user.id, parseResult.data);
  if (!result.success) {
    return res.status(400).json({
      error: {
        code: 'REVIEW_FAILED',
        message: result.error,
      },
    });
  }

  // Audit event for review submission
  recordAuditLog({
    actorId: user.id,
    eventType: 'TASK_REVIEW_SUBMITTED',
    resourceType: 'REVIEW',
    resourceId: result.review?.id || taskId,
    ipHash: hashIp(req.ip || '127.0.0.1'),
    userAgentMasked: 'client',
    metadata: {
      taskId,
      rating: parseResult.data.rating,
      isRevealed: result.isRevealed,
      isSybilCapped: result.review?.isSybilCapped,
      doubleBlindComplete: result.doubleBlindComplete,
    },
  });

  if (result.doubleBlindComplete) {
    recordAuditLog({
      actorId: user.id,
      eventType: 'REVIEWS_REVEALED_DOUBLE_BLIND',
      resourceType: 'TASK',
      resourceId: taskId,
      ipHash: hashIp(req.ip || '127.0.0.1'),
      userAgentMasked: 'client',
      metadata: { taskId },
    });

    recordAuditLog({
      actorId: 'system',
      eventType: 'TASK_PRIVACY_PURGED',
      resourceType: 'TASK',
      resourceId: taskId,
      ipHash: hashIp(req.ip || '127.0.0.1'),
      userAgentMasked: 'system',
      metadata: { taskId, reason: 'Double-blind reviews completed' },
    });
  }

  return res.status(201).json({
    success: true,
    message: result.isRevealed
      ? 'Double-blind reviews completed! Ratings and feedback are now revealed on profiles.'
      : 'Your review has been submitted privately. It will be revealed once your neighbor also reviews, preventing retaliatory scores.',
    review: result.review,
    isRevealed: result.isRevealed,
    doubleBlindComplete: result.doubleBlindComplete,
  });
});

// 18. Get task review status
apiRouter.get('/tasks/:id/reviews', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user;
  const taskId = req.params.id;

  const result = getTaskReviewStatus(taskId, user.id);
  if (!result.success) {
    return res.status(404).json({
      error: {
        code: 'TASK_NOT_FOUND',
        message: result.error,
      },
    });
  }

  return res.json(result);
});

// 19. Get revealed reviews for a user
apiRouter.get('/users/:id/reviews', (req: Request, res: Response) => {
  const userId = req.params.id;
  const userReviews = getUserRevealedReviews(userId);
  return res.json({ reviews: userReviews });
});

// 20. Manual/Emergency Privacy Purge for completed task
apiRouter.post('/tasks/:id/purge-privacy', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user;
  const taskId = req.params.id;

  const taskResult = getTaskById(taskId);
  if (!taskResult || !taskResult.task) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Task not found.' } });
  }

  if (taskResult.task.requesterId !== user.id && user.role !== 'MODERATOR') {
    return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Only the requester or moderator can purge privacy data.' } });
  }

  const result = purgeTaskPrivacyData(taskId);
  if (!result.success) {
    return res.status(400).json({ error: { code: 'PURGE_FAILED', message: result.error } });
  }

  recordAuditLog({
    actorId: user.id,
    eventType: 'TASK_PRIVACY_PURGED_MANUAL',
    resourceType: 'TASK',
    resourceId: taskId,
    ipHash: hashIp(req.ip || '127.0.0.1'),
    userAgentMasked: 'client',
    metadata: { taskId },
  });

  return res.json({
    success: true,
    message: 'Pickup building & sensitive location details have been permanently scrubbed.',
  });
});



