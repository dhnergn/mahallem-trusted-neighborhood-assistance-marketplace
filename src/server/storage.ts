import {
  User,
  UserTrustMetrics,
  PublicTrustProfile,
  AuthSession,
  Task,
  TaskDiscoveryCard,
  TaskOffer,
  TaskStatus,
  UserRole,
  ChatMessage,
  TaskConversation,
  UserReport,
  UserBlock,
  ReportCategory,
  TaskReview,
  TaskReviewStatus,
} from '../types/index.ts';
import { hashIdentifier, maskPhone, maskEmail, generateOtpCode } from '../lib/crypto.ts';
import { calculateDistanceKm, applyPrivacyJitter, formatApproximateDistance, ISTANBUL_NEIGHBORHOODS } from '../lib/geo.ts';
import { validateTaskTransition } from '../lib/state-machine.ts';
import { filterChatMessage } from '../lib/message-filter.ts';

interface VerificationChallenge {
  identifierHash: string;
  code: string;
  attemptsRemaining: number;
  expiresAt: number;
  createdAt: number;
}

// In-memory data structures
export const users = new Map<string, User>();
export const trustMetrics = new Map<string, UserTrustMetrics>();
export const sessions = new Map<string, AuthSession>();
export const verificationChallenges = new Map<string, VerificationChallenge>();
export const tasks = new Map<string, Task>();
export const offers = new Map<string, TaskOffer>();
export const taskOtps = new Map<string, string>(); // taskId -> plain 6-digit handover OTP
export const otpAttempts = new Map<string, number>(); // taskId -> failed attempts count
export const messages = new Map<string, ChatMessage>();
export const reports = new Map<string, UserReport>();
export const blocks = new Map<string, UserBlock>(); // key: `${blockerId}_${blockedId}`
export const reviews = new Map<string, TaskReview>();

// Seed default vetted neighborhood accounts for immediate testing and verification
const SEED_USERS: Array<{
  id: string;
  phone: string;
  email: string;
  displayName: string;
  avatarUrl: string;
  role: 'VERIFIED_NEIGHBOR' | 'USER' | 'MODERATOR';
  neighborhood: string;
  district: string;
  completedTasks: number;
  cancelledTasks: number;
  disputes: number;
  positiveRatings: number;
  totalRatings: number;
  categories: Record<string, number>;
  memberSinceDaysAgo: number;
}> = [
  {
    id: 'a1b2c3d4-0001-4000-8000-000000000001',
    phone: '+90 532 111 2233',
    email: 'deniz.kaya@example.com',
    displayName: 'Deniz Kaya',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    role: 'VERIFIED_NEIGHBOR',
    neighborhood: 'Moda',
    district: 'Kadıköy',
    completedTasks: 42,
    cancelledTasks: 1,
    disputes: 0,
    positiveRatings: 41,
    totalRatings: 42,
    categories: { 'package-transport': 24, 'grocery-pickup': 12, 'pet-care': 6 },
    memberSinceDaysAgo: 180,
  },
  {
    id: 'a1b2c3d4-0002-4000-8000-000000000002',
    phone: '+90 533 222 3344',
    email: 'can.ozdemir@example.com',
    displayName: 'Can Özdemir',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    role: 'VERIFIED_NEIGHBOR',
    neighborhood: 'Akaretler',
    district: 'Beşiktaş',
    completedTasks: 19,
    cancelledTasks: 0,
    disputes: 0,
    positiveRatings: 19,
    totalRatings: 19,
    categories: { 'package-transport': 10, 'product-pickup': 9 },
    memberSinceDaysAgo: 95,
  },
  {
    id: 'a1b2c3d4-0003-4000-8000-000000000003',
    phone: '+90 534 333 4455',
    email: 'zeynep.arslan@example.com',
    displayName: 'Zeynep Arslan',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    role: 'USER',
    neighborhood: 'Caferağa',
    district: 'Kadıköy',
    completedTasks: 3,
    cancelledTasks: 0,
    disputes: 0,
    positiveRatings: 3,
    totalRatings: 3,
    categories: { 'local-favor': 3 },
    memberSinceDaysAgo: 14,
  },
  {
    id: 'a1b2c3d4-0004-4000-8000-000000000004',
    phone: '+90 535 444 5566',
    email: 'selim.guvenlik@example.com',
    displayName: 'Selim Koç (Moderator)',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    role: 'MODERATOR',
    neighborhood: 'Kuzguncuk',
    district: 'Üsküdar',
    completedTasks: 58,
    cancelledTasks: 0,
    disputes: 0,
    positiveRatings: 58,
    totalRatings: 58,
    categories: { 'package-transport': 30, 'grocery-pickup': 20, 'local-favor': 8 },
    memberSinceDaysAgo: 320,
  }
];

// Initial Seed Tasks
const SEED_TASKS = [
  {
    id: 'tsk_0001_seed_kadikoy_besiktas',
    requesterId: 'a1b2c3d4-0001-4000-8000-000000000001', // Deniz Kaya
    categoryId: 'package-transport',
    title: 'Kadıköy Ferry to Beşiktaş: Small architectural sketchbook delivery',
    description: 'I need a small architectural sketchbook handed to a student friend at the Beşiktaş ferry terminal. The sketchbook is open for full visual inspection. Takes 2 minutes at the pier.',
    status: 'OPEN' as const,
    district: 'Kadıköy',
    neighborhood: 'Moda',
    neighborhoodKey: 'moda-kadikoy',
    destinationDistrict: 'Beşiktaş',
    destinationNeighborhood: 'Akaretler',
    pickupAddressSensitive: 'Moda Cd. No: 42, Apt 3 (Will meet in front of Kemal Cinema)',
    rewardCents: 15000, // 150 TL
    estimatedMinutes: 25,
    openInspectionAgreed: true,
    hoursAgo: 2,
  },
  {
    id: 'tsk_0002_seed_grocery_moda',
    requesterId: 'a1b2c3d4-0003-4000-8000-000000000003', // Zeynep Arslan
    categoryId: 'grocery-pickup',
    title: 'Local grocery run for elderly neighbor in Caferağa',
    description: 'Picking up 2 bottles of organic milk, eggs, and bread from Caferağa neighborhood market. Receipt will be provided and reimbursed immediately.',
    status: 'OPEN' as const,
    district: 'Kadıköy',
    neighborhood: 'Caferağa',
    neighborhoodKey: 'caferaga-kadikoy',
    destinationDistrict: 'Kadıköy',
    destinationNeighborhood: 'Caferağa',
    pickupAddressSensitive: 'Caferağa Mah. Şair Nefi Sk. No: 18',
    rewardCents: 10000, // 100 TL
    estimatedMinutes: 20,
    openInspectionAgreed: true,
    hoursAgo: 4,
  },
  {
    id: 'tsk_0003_seed_artisan_kuzguncuk',
    requesterId: 'a1b2c3d4-0004-4000-8000-000000000004', // Selim Koç (Moderator)
    categoryId: 'product-pickup',
    title: 'Pickup handmade ceramic bowl from Kuzguncuk Atelier',
    description: 'A pre-paid decorative ceramic bowl needs pickup from Kuzguncuk Çarşı Atelier and drop-off near Üsküdar Marmaray station. Fragile but packaged in transparent protective wrap.',
    status: 'OPEN' as const,
    district: 'Üsküdar',
    neighborhood: 'Kuzguncuk',
    neighborhoodKey: 'kuzguncuk-uskudar',
    destinationDistrict: 'Üsküdar',
    destinationNeighborhood: 'Marmaray Concourse',
    pickupAddressSensitive: 'İcadiye Cd. No: 88, Kuzguncuk',
    rewardCents: 20000, // 200 TL
    estimatedMinutes: 30,
    openInspectionAgreed: true,
    hoursAgo: 6,
  },
  {
    id: 'tsk_0004_seed_library_besiktas',
    requesterId: 'a1b2c3d4-0002-4000-8000-000000000002', // Can Özdemir
    categoryId: 'item-return',
    title: 'Drop off research book to Kadıköy Central Library',
    description: 'I borrowed a history book that is due today. Anyone taking the Beşiktaş-Kadıköy ferry who can drop it at the library return drop-box in Caferağa?',
    status: 'OPEN' as const,
    district: 'Beşiktaş',
    neighborhood: 'Akaretler',
    neighborhoodKey: 'akaretler-besiktas',
    destinationDistrict: 'Kadıköy',
    destinationNeighborhood: 'Caferağa',
    pickupAddressSensitive: 'Süleyman Seba Cd. No: 12, Akaretler',
    rewardCents: 12000, // 120 TL
    estimatedMinutes: 20,
    openInspectionAgreed: true,
    hoursAgo: 1,
  },
];

// Initialize seed data
export function initializeStorage() {
  if (users.size > 0 && tasks.size > 0) return;

  const now = new Date();

  for (const s of SEED_USERS) {
    const memberSince = new Date(now.getTime() - s.memberSinceDaysAgo * 86400000);
    const user: User = {
      id: s.id,
      phoneHash: hashIdentifier(s.phone),
      phoneMasked: maskPhone(s.phone),
      emailMasked: maskEmail(s.email),
      displayName: s.displayName,
      avatarUrl: s.avatarUrl,
      role: s.role,
      status: 'ACTIVE',
      neighborhood: s.neighborhood,
      district: s.district,
      idVerifiedAt: s.role === 'VERIFIED_NEIGHBOR' || s.role === 'MODERATOR' ? memberSince.toISOString() : null,
      phoneVerifiedAt: memberSince.toISOString(),
      createdAt: memberSince.toISOString(),
      updatedAt: now.toISOString(),
    };

    users.set(user.id, user);

    const total = s.completedTasks + s.cancelledTasks;
    const completionRate = total > 0 ? Math.round((s.completedTasks / total) * 100) : 100;
    const ratingScore = s.totalRatings > 0 ? (s.positiveRatings / s.totalRatings) * 100 : 100;

    const metrics: UserTrustMetrics = {
      userId: user.id,
      tasksRequestedCount: Math.round(s.completedTasks * 0.4),
      tasksCompletedCount: s.completedTasks,
      tasksCancelledCount: s.cancelledTasks,
      disputesCount: s.disputes,
      positiveRatingsCount: s.positiveRatings,
      totalRatingsCount: s.totalRatings,
      reputationScore: Number(ratingScore.toFixed(1)),
      completionRate,
      categoryExperience: s.categories,
      memberSince: memberSince.toISOString(),
    };

    trustMetrics.set(user.id, metrics);
  }

  // Create an initial active session for Deniz Kaya (first demo user)
  const defaultSessionToken = 'demo_session_deniz_kaya';
  sessions.set(defaultSessionToken, {
    token: defaultSessionToken,
    userId: SEED_USERS[0].id,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + 7 * 86400000).toISOString(),
    lastActiveAt: now.toISOString(),
  });

  // Seed initial tasks
  for (const st of SEED_TASKS) {
    const loc = ISTANBUL_NEIGHBORHOODS[st.neighborhoodKey] || ISTANBUL_NEIGHBORHOODS['moda-kadikoy'];
    const coarseGeo = applyPrivacyJitter(loc.centroid);
    const createdAt = new Date(now.getTime() - st.hoursAgo * 3600000).toISOString();

    const task: Task = {
      id: st.id,
      requesterId: st.requesterId,
      categoryId: st.categoryId,
      title: st.title,
      description: st.description,
      status: st.status,
      district: st.district,
      neighborhood: st.neighborhood,
      coarseLat: coarseGeo.lat,
      coarseLng: coarseGeo.lng,
      destinationDistrict: st.destinationDistrict,
      destinationNeighborhood: st.destinationNeighborhood,
      pickupAddressEncrypted: st.pickupAddressSensitive,
      pickupLat: loc.centroid.lat,
      pickupLng: loc.centroid.lng,
      rewardCents: st.rewardCents,
      estimatedMinutes: st.estimatedMinutes,
      openInspectionAgreed: st.openInspectionAgreed,
      moderationSource: 'SEED',
      version: 1,
      expiresAt: new Date(now.getTime() + 24 * 3600000).toISOString(),
      createdAt,
      updatedAt: createdAt,
    };

    tasks.set(task.id, task);
  }
}

// Compute sanitized public trust profile
export function computePublicTrustProfile(userId: string): PublicTrustProfile | null {
  const user = users.get(userId);
  if (!user) return null;

  const metrics = trustMetrics.get(userId) || {
    userId,
    tasksRequestedCount: 0,
    tasksCompletedCount: 0,
    tasksCancelledCount: 0,
    disputesCount: 0,
    positiveRatingsCount: 0,
    totalRatingsCount: 0,
    reputationScore: 100,
    completionRate: 100,
    categoryExperience: {},
    memberSince: user.createdAt,
  };

  const badges: string[] = [];
  if (user.idVerifiedAt) badges.push('Government ID Verified');
  if (user.phoneVerifiedAt) badges.push('Phone Confirmed');
  if (metrics.tasksCompletedCount >= 10 && metrics.completionRate >= 95) badges.push('Top Neighbor');
  if (metrics.disputesCount === 0 && metrics.tasksCompletedCount >= 5) badges.push('Zero Dispute Record');
  if (new Date().getTime() - new Date(user.createdAt).getTime() > 90 * 86400000) badges.push('Established Resident');

  const categoryNames: Record<string, string> = {
    'package-transport': 'Package Transport',
    'grocery-pickup': 'Grocery Pickup',
    'product-pickup': 'Product Pickup',
    'pet-care': 'Pet Assistance',
    'local-favor': 'Neighborhood Favor',
    'item-return': 'Item Return',
    'traveler-carry': 'Traveler Carry',
  };

  const categoryBreakdown = Object.entries(metrics.categoryExperience).map(([catId, count]) => ({
    categoryId: catId,
    categoryName: categoryNames[catId] || catId,
    completed: count,
  }));

  const userReviews = getUserRevealedReviews(user.id);

  return {
    userId: user.id,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    role: user.role,
    neighborhood: user.neighborhood,
    district: user.district,
    isIdVerified: !!user.idVerifiedAt,
    isPhoneVerified: !!user.phoneVerifiedAt,
    tasksCompletedCount: metrics.tasksCompletedCount,
    completionRate: metrics.completionRate,
    reputationScore: metrics.reputationScore,
    memberSince: metrics.memberSince,
    badges,
    categoryBreakdown,
    reviews: userReviews.slice(0, 5),
    reviewsCount: userReviews.length,
  };
}

/**
 * Creates a new task in storage with coarse jitter applied to public coordinates
 */
export function createTaskInStorage(
  requesterId: string,
  data: {
    categoryId: string;
    title: string;
    description: string;
    neighborhoodKey: string;
    destinationDistrict?: string;
    destinationNeighborhood?: string;
    pickupAddressSensitive?: string;
    rewardCents: number;
    estimatedMinutes: number;
    openInspectionAgreed: boolean;
    moderationSource: string;
  }
): Task {
  const loc = ISTANBUL_NEIGHBORHOODS[data.neighborhoodKey] || ISTANBUL_NEIGHBORHOODS['moda-kadikoy'];
  const coarseGeo = applyPrivacyJitter(loc.centroid);
  const now = new Date();
  const taskId = `tsk_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const task: Task = {
    id: taskId,
    requesterId,
    categoryId: data.categoryId,
    title: data.title,
    description: data.description,
    status: 'OPEN',
    district: loc.district,
    neighborhood: loc.neighborhood,
    coarseLat: coarseGeo.lat,
    coarseLng: coarseGeo.lng,
    destinationDistrict: data.destinationDistrict,
    destinationNeighborhood: data.destinationNeighborhood,
    pickupAddressEncrypted: data.pickupAddressSensitive,
    pickupLat: loc.centroid.lat,
    pickupLng: loc.centroid.lng,
    rewardCents: data.rewardCents,
    estimatedMinutes: data.estimatedMinutes,
    openInspectionAgreed: data.openInspectionAgreed,
    moderationSource: data.moderationSource,
    version: 1,
    expiresAt: new Date(now.getTime() + 24 * 3600000).toISOString(),
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  tasks.set(task.id, task);
  return task;
}

/**
 * Returns discovery tasks filtered by proximity and sanitized from exact coordinates
 */
export function getTasksForDiscovery(
  viewerPoint: { lat: number; lng: number } = { lat: 40.9833, lng: 29.0267 }, // Default Moda
  filters?: {
    category?: string;
    district?: string;
    maxDistanceKm?: number;
  }
): TaskDiscoveryCard[] {
  const results: TaskDiscoveryCard[] = [];

  for (const task of tasks.values()) {
    // Only OPEN tasks in discovery
    if (task.status !== 'OPEN') continue;

    if (filters?.category && task.categoryId !== filters.category) continue;
    if (filters?.district && task.district !== filters.district) continue;

    const distanceKm = calculateDistanceKm(viewerPoint, {
      lat: task.coarseLat,
      lng: task.coarseLng,
    });

    if (filters?.maxDistanceKm && distanceKm > filters.maxDistanceKm) continue;

    const requester = users.get(task.requesterId);
    const trust = trustMetrics.get(task.requesterId);

    if (!requester || !trust) continue;

    results.push({
      id: task.id,
      categoryId: task.categoryId,
      title: task.title,
      description: task.description,
      status: task.status,
      district: task.district,
      neighborhood: task.neighborhood,
      destinationDistrict: task.destinationDistrict,
      destinationNeighborhood: task.destinationNeighborhood,
      distanceKm,
      approxDistanceFormatted: formatApproximateDistance(distanceKm),
      rewardCents: task.rewardCents,
      estimatedMinutes: task.estimatedMinutes,
      openInspectionAgreed: task.openInspectionAgreed,
      createdAt: task.createdAt,
      requester: {
        id: requester.id,
        displayName: requester.displayName,
        avatarUrl: requester.avatarUrl,
        role: requester.role,
        neighborhood: requester.neighborhood,
        isIdVerified: !!requester.idVerifiedAt,
        reputationScore: trust.reputationScore,
        completionRate: trust.completionRate,
        tasksCompletedCount: trust.tasksCompletedCount,
      },
    });
  }

  // Sort by nearest distance first
  return results.sort((a, b) => a.distanceKm - b.distanceKm);
}

/**
 * Authorization Guarded Task Retrieval (BOLA/IDOR Defense):
 * If the current viewer is neither the requester nor the accepted helper,
 * precise addresses and exact GPS coordinates are strictly redacted.
 */
export function getTaskById(taskId: string, viewerUserId?: string): { task: Partial<Task>; canViewExactDetails: boolean } | null {
  const task = tasks.get(taskId);
  if (!task) return null;

  const isRequester = viewerUserId && task.requesterId === viewerUserId;
  const isAcceptedHelper = viewerUserId && task.acceptedHelperId === viewerUserId;
  const canViewExactDetails = Boolean((isRequester || isAcceptedHelper) && task.status !== 'OPEN');

  if (canViewExactDetails) {
    return { task, canViewExactDetails: true };
  }

  // Sanitize exact pickup details
  const { pickupAddressEncrypted, pickupLat, pickupLng, completionOtpHmac, ...sanitized } = task;
  return { task: sanitized, canViewExactDetails: false };
}

// ==========================================
// PHASE 4: OFFERS, STATE MACHINE & HANDOVER OTP
// ==========================================

/**
 * Submit an offer to assist on an OPEN task
 */
export function submitTaskOffer(
  taskId: string,
  helperId: string,
  message: string,
  estimatedArrivalMinutes: number
): { success: boolean; offer?: TaskOffer; error?: string } {
  const task = tasks.get(taskId);
  if (!task) return { success: false, error: 'Task not found.' };

  if (task.status !== 'OPEN') {
    return { success: false, error: 'This task is no longer accepting offers.' };
  }

  if (task.requesterId === helperId) {
    return { success: false, error: 'You cannot make an offer on your own task.' };
  }

  // Prevent duplicate active offers
  for (const o of offers.values()) {
    if (o.taskId === taskId && o.helperId === helperId && o.status === 'PENDING') {
      return { success: false, error: 'You already have an active offer on this task.' };
    }
  }

  const helper = users.get(helperId);
  const trust = trustMetrics.get(helperId);
  if (!helper || !trust) return { success: false, error: 'Helper profile not found.' };

  const offerId = `ofr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const offer: TaskOffer = {
    id: offerId,
    taskId,
    helperId,
    message,
    estimatedArrivalMinutes,
    status: 'PENDING',
    createdAt: new Date().toISOString(),
    helper: {
      id: helper.id,
      displayName: helper.displayName,
      avatarUrl: helper.avatarUrl,
      role: helper.role,
      neighborhood: helper.neighborhood,
      isIdVerified: !!helper.idVerifiedAt,
      reputationScore: trust.reputationScore,
      completionRate: trust.completionRate,
      tasksCompletedCount: trust.tasksCompletedCount,
    },
  };

  offers.set(offer.id, offer);
  return { success: true, offer };
}

/**
 * Get all offers for a specific task (Requester only)
 */
export function getTaskOffers(taskId: string, requesterId: string): TaskOffer[] | null {
  const task = tasks.get(taskId);
  if (!task || task.requesterId !== requesterId) return null;

  const result: TaskOffer[] = [];
  for (const o of offers.values()) {
    if (o.taskId === taskId) {
      result.push(o);
    }
  }
  return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * Requester accepts a helper's offer:
 * Transitions task from OPEN -> ACCEPTED, sets acceptedHelperId,
 * generates cryptographic 6-digit completion OTP, and declines other offers.
 */
export function acceptTaskOffer(
  taskId: string,
  offerId: string,
  requesterId: string
): { success: boolean; task?: Task; completionOtp?: string; error?: string } {
  const task = tasks.get(taskId);
  if (!task) return { success: false, error: 'Task not found.' };

  if (task.requesterId !== requesterId) {
    return { success: false, error: 'Only the task requester can accept an offer.' };
  }

  if (task.status !== 'OPEN') {
    return { success: false, error: `Task cannot be accepted in current state: ${task.status}` };
  }

  const selectedOffer = offers.get(offerId);
  if (!selectedOffer || selectedOffer.taskId !== taskId) {
    return { success: false, error: 'Offer not found.' };
  }

  // Generate 6-digit handover OTP
  const completionOtp = generateOtpCode();
  const otpHmac = hashIdentifier(completionOtp);

  // Transition task
  task.status = 'ACCEPTED';
  task.acceptedHelperId = selectedOffer.helperId;
  task.matchedAt = new Date().toISOString();
  task.acceptedAt = new Date().toISOString();
  task.completionOtpHmac = otpHmac;
  task.version += 1;
  task.updatedAt = new Date().toISOString();

  // Store plain OTP in memory for the requester to view
  taskOtps.set(task.id, completionOtp);
  otpAttempts.set(task.id, 0);

  // Mark this offer as ACCEPTED, others for this task as DECLINED
  selectedOffer.status = 'ACCEPTED';
  for (const o of offers.values()) {
    if (o.taskId === taskId && o.id !== offerId) {
      o.status = 'DECLINED';
    }
  }

  return { success: true, task, completionOtp };
}

/**
 * Transitions task status with finite state machine validation
 */
export function transitionTaskState(
  taskId: string,
  targetStatus: TaskStatus,
  actor: { userId: string; role: UserRole },
  reason?: string
): { success: boolean; task?: Task; error?: string } {
  const task = tasks.get(taskId);
  if (!task) return { success: false, error: 'Task not found.' };

  const validation = validateTaskTransition(task.status, targetStatus, actor, {
    requesterId: task.requesterId,
    acceptedHelperId: task.acceptedHelperId,
  });

  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  task.status = targetStatus;
  task.version += 1;
  task.updatedAt = new Date().toISOString();

  if (targetStatus === 'CANCELLED') {
    // If task is cancelled, purge OTP
    taskOtps.delete(task.id);
  }

  return { success: true, task };
}

/**
 * Helper submits the 6-digit physical Handover OTP provided by the recipient
 */
export function verifyHandoverOtp(
  taskId: string,
  helperId: string,
  submittedOtp: string
): { success: boolean; task?: Task; error?: string } {
  const task = tasks.get(taskId);
  if (!task) return { success: false, error: 'Task not found.' };

  if (task.acceptedHelperId !== helperId) {
    return { success: false, error: 'Only the assigned helper can submit the completion OTP.' };
  }

  if (task.status !== 'IN_PROGRESS' && task.status !== 'ACCEPTED') {
    return { success: false, error: `Cannot complete handover when task is in ${task.status} status.` };
  }

  const storedOtp = taskOtps.get(taskId);
  const attempts = otpAttempts.get(taskId) || 0;

  if (attempts >= 3) {
    return { success: false, error: 'Too many incorrect attempts. This handover is flagged for moderator review.' };
  }

  if (!storedOtp || storedOtp !== submittedOtp.trim()) {
    otpAttempts.set(taskId, attempts + 1);
    return {
      success: false,
      error: `Invalid handover code. ${2 - attempts} attempts remaining before lockout.`,
    };
  }

  // Code verified! Finalize task
  const nowIso = new Date().toISOString();
  task.status = 'COMPLETED';
  task.completedAt = nowIso;
  task.version += 1;
  task.updatedAt = nowIso;

  // Clean up OTP memory
  taskOtps.delete(taskId);
  otpAttempts.delete(taskId);

  // Update trust metrics for both requester and helper
  const helperTrust = trustMetrics.get(helperId);
  if (helperTrust) {
    helperTrust.tasksCompletedCount += 1;
    helperTrust.positiveRatingsCount += 1;
    helperTrust.totalRatingsCount += 1;
    const catCount = helperTrust.categoryExperience[task.categoryId] || 0;
    helperTrust.categoryExperience[task.categoryId] = catCount + 1;
  }

  const requesterTrust = trustMetrics.get(task.requesterId);
  if (requesterTrust) {
    requesterTrust.tasksRequestedCount += 1;
  }

  return { success: true, task };
}

/**
 * Get active tasks for current user (requested tasks + helping tasks)
 * Strictly reveals plain completion OTP to requester only!
 */
export function getUserTasks(userId: string): {
  requested: Array<Task & { completionOtp?: string }>;
  helping: Task[];
} {
  const requested: Array<Task & { completionOtp?: string }> = [];
  const helping: Task[] = [];

  for (const task of tasks.values()) {
    if (task.requesterId === userId) {
      const otp = taskOtps.get(task.id);
      requested.push({
        ...task,
        completionOtp: otp, // Requester sees the code to give to the helper
      });
    } else if (task.acceptedHelperId === userId) {
      // Helper sees the task, but NEVER the completion OTP!
      const { completionOtpHmac, ...helperView } = task;
      helping.push(helperView as Task);
    }
  }

  return {
    requested: requested.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    helping: helping.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
  };
}

// ==========================================
// PHASE 5: EPHEMERAL CHAT & ABUSE REPORT/BLOCK
// ==========================================

export function isBlockedPair(userA: string, userB: string): boolean {
  return blocks.has(`${userA}_${userB}`) || blocks.has(`${userB}_${userA}`);
}

/**
 * Authorization Guarded Task Conversation Retrieval (BOLA Defense):
 * Validates that current user is either the requester or accepted helper.
 */
export function getTaskConversation(taskId: string, currentUserId: string): { success: boolean; conversation?: TaskConversation; error?: string } {
  const task = tasks.get(taskId);
  if (!task) return { success: false, error: 'Task not found.' };

  const isRequester = task.requesterId === currentUserId;
  const isAcceptedHelper = task.acceptedHelperId === currentUserId;

  if (!isRequester && !isAcceptedHelper) {
    return {
      success: false,
      error: 'Access denied: You are not an authorized participant in this task conversation.',
    };
  }

  const otherParticipantId = isRequester ? task.acceptedHelperId : task.requesterId;
  if (!otherParticipantId) {
    return {
      success: false,
      error: 'No active match or helper assigned yet.',
    };
  }

  if (isBlockedPair(currentUserId, otherParticipantId)) {
    return {
      success: false,
      error: 'Communication unavailable: One or both participants have blocked the other.',
    };
  }

  const otherUser = users.get(otherParticipantId);
  const otherTrust = trustMetrics.get(otherParticipantId);
  if (!otherUser || !otherTrust) {
    return { success: false, error: 'Counterparty profile unavailable.' };
  }

  // Get messages for this task
  const taskMessages: ChatMessage[] = [];
  for (const m of messages.values()) {
    if (m.taskId === taskId) {
      taskMessages.push(m);
    }
  }

  taskMessages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const conversationId = `conv_${taskId}`;
  const conversation: TaskConversation = {
    id: conversationId,
    taskId: task.id,
    taskTitle: task.title,
    taskStatus: task.status,
    requesterId: task.requesterId,
    helperId: task.acceptedHelperId!,
    otherParticipant: {
      id: otherUser.id,
      displayName: otherUser.displayName,
      avatarUrl: otherUser.avatarUrl,
      role: otherUser.role,
      neighborhood: otherUser.neighborhood,
      isIdVerified: !!otherUser.idVerifiedAt,
      reputationScore: otherTrust.reputationScore,
    },
    isActive: task.status === 'ACCEPTED' || task.status === 'IN_PROGRESS',
    messages: taskMessages,
  };

  return { success: true, conversation };
}

/**
 * Send an ephemeral message within a task conversation:
 * - Checks authorization
 * - Checks block state
 * - Screens for off-platform leakage (phone numbers, WhatsApp/Telegram links)
 */
export function sendTaskMessage(
  taskId: string,
  senderId: string,
  rawContent: string
): { success: boolean; message?: ChatMessage; error?: string } {
  const task = tasks.get(taskId);
  if (!task) return { success: false, error: 'Task not found.' };

  const isRequester = task.requesterId === senderId;
  const isAcceptedHelper = task.acceptedHelperId === senderId;

  if (!isRequester && !isAcceptedHelper) {
    return { success: false, error: 'Only assigned task participants can send messages.' };
  }

  if (task.status !== 'ACCEPTED' && task.status !== 'IN_PROGRESS') {
    return { success: false, error: `Conversation is closed because task status is ${task.status}.` };
  }

  const recipientId = isRequester ? task.acceptedHelperId! : task.requesterId;
  if (isBlockedPair(senderId, recipientId)) {
    return { success: false, error: 'Message cannot be delivered: User is blocked.' };
  }

  const sender = users.get(senderId);
  if (!sender) return { success: false, error: 'Sender not found.' };

  // Filter message for contact info & off-platform leakage
  const filterResult = filterChatMessage(rawContent);

  const msgId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const message: ChatMessage = {
    id: msgId,
    conversationId: `conv_${taskId}`,
    taskId,
    senderId,
    senderName: sender.displayName,
    senderAvatar: sender.avatarUrl,
    content: filterResult.sanitizedContent,
    hasShieldedContent: filterResult.hasExternalContactLeak,
    flaggedReasons: filterResult.flaggedReasons,
    createdAt: new Date().toISOString(),
  };

  messages.set(message.id, message);
  return { success: true, message };
}

/**
 * Submit abuse/fraud report
 */
export function submitUserReport(
  reporterId: string,
  data: {
    reportedUserId?: string;
    reportedTaskId?: string;
    category: ReportCategory;
    description: string;
  }
): UserReport {
  const reportId = `rep_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const report: UserReport = {
    id: reportId,
    reporterId,
    reportedUserId: data.reportedUserId,
    reportedTaskId: data.reportedTaskId,
    category: data.category,
    description: data.description,
    status: 'PENDING',
    createdAt: new Date().toISOString(),
  };

  reports.set(report.id, report);
  return report;
}

/**
 * Block a user
 */
export function blockUser(
  blockerId: string,
  blockedId: string,
  reason?: string
): { success: boolean; block?: UserBlock; error?: string } {
  if (blockerId === blockedId) {
    return { success: false, error: 'You cannot block yourself.' };
  }

  const blockedUser = users.get(blockedId);
  if (!blockedUser) {
    return { success: false, error: 'User to block not found.' };
  }

  const key = `${blockerId}_${blockedId}`;
  const block: UserBlock = {
    blockerId,
    blockedId,
    blockedName: blockedUser.displayName,
    reason,
    createdAt: new Date().toISOString(),
  };

  blocks.set(key, block);
  return { success: true, block };
}

/**
 * Get list of blocked users for an actor
 */
export function getBlockedUsers(blockerId: string): UserBlock[] {
  const result: UserBlock[] = [];
  for (const b of blocks.values()) {
    if (b.blockerId === blockerId) {
      result.push(b);
    }
  }
  return result;
}

// ==========================================
// DOUBLE-BLIND REVIEWS & SYBIL-RESISTANT REPUTATION (PHASE 6)
// ==========================================

export function recalculateUserReputation(userId: string): void {
  const trust = trustMetrics.get(userId);
  if (!trust) return;

  const validReviews: TaskReview[] = [];
  for (const r of reviews.values()) {
    if (r.revieweeId === userId && r.isRevealed && !r.isSybilCapped) {
      validReviews.push(r);
    }
  }

  if (validReviews.length > 0) {
    const positiveCount = validReviews.filter(r => r.rating >= 4).length;
    trust.positiveRatingsCount = positiveCount;
    trust.totalRatingsCount = validReviews.length;
    trust.reputationScore = Number(((positiveCount / validReviews.length) * 100).toFixed(1));
  }
}

export function getUserRevealedReviews(userId: string): TaskReview[] {
  const result: TaskReview[] = [];
  for (const r of reviews.values()) {
    if (r.revieweeId === userId && r.isRevealed) {
      result.push(r);
    }
  }
  return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function purgeTaskPrivacyData(taskId: string): { success: boolean; task?: Task; error?: string } {
  const task = tasks.get(taskId);
  if (!task) return { success: false, error: 'Task not found.' };

  task.pickupAddressEncrypted = '[PURGED: Post-handover neighborhood privacy policy]';
  task.pickupLat = undefined;
  task.pickupLng = undefined;
  task.version += 1;
  task.updatedAt = new Date().toISOString();

  return { success: true, task };
}

export function submitTaskReview(
  taskId: string,
  reviewerId: string,
  input: { rating: number; comment: string }
): {
  success: boolean;
  review?: TaskReview;
  isRevealed?: boolean;
  doubleBlindComplete?: boolean;
  error?: string;
} {
  const task = tasks.get(taskId);
  if (!task) return { success: false, error: 'Task not found.' };

  if (task.status !== 'COMPLETED' && task.status !== 'CONFIRMED') {
    return { success: false, error: `Reviews can only be submitted for completed tasks. Current status: ${task.status}` };
  }

  const isRequester = task.requesterId === reviewerId;
  const isHelper = task.acceptedHelperId === reviewerId;
  if (!isRequester && !isHelper) {
    return { success: false, error: 'Only the task requester or assigned helper can submit a review.' };
  }

  const revieweeId = isRequester ? task.acceptedHelperId! : task.requesterId;
  const reviewer = users.get(reviewerId);
  if (!reviewer) return { success: false, error: 'Reviewer user not found.' };

  // Prevent duplicate review by same user on same task
  for (const r of reviews.values()) {
    if (r.taskId === taskId && r.reviewerId === reviewerId) {
      return { success: false, error: 'You have already submitted a review for this task.' };
    }
  }

  // Sybil Defense Capping:
  // Count interactions (reviews) between this pair in the past 30 days
  const thirtyDaysAgo = Date.now() - 30 * 86400000;
  let interactionCount = 0;
  for (const r of reviews.values()) {
    const isPair = (r.reviewerId === reviewerId && r.revieweeId === revieweeId) ||
                   (r.reviewerId === revieweeId && r.revieweeId === reviewerId);
    if (isPair && new Date(r.createdAt).getTime() >= thirtyDaysAgo) {
      interactionCount++;
    }
  }
  // If pair has >= 2 interactions in 30 days, flag as sybil-capped (recorded but not counted in reputation)
  const isSybilCapped = interactionCount >= 2;

  // Check if counterparty has already submitted a review
  let counterpartyReview: TaskReview | undefined;
  for (const r of reviews.values()) {
    if (r.taskId === taskId && r.reviewerId === revieweeId) {
      counterpartyReview = r;
      break;
    }
  }

  const nowIso = new Date().toISOString();
  const willReveal = !!counterpartyReview;
  const reviewId = `rev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const newReview: TaskReview = {
    id: reviewId,
    taskId,
    reviewerId,
    reviewerName: reviewer.displayName,
    reviewerAvatar: reviewer.avatarUrl,
    revieweeId,
    rating: input.rating,
    comment: input.comment.trim(),
    isRevealed: willReveal,
    isSybilCapped,
    createdAt: nowIso,
    revealedAt: willReveal ? nowIso : undefined,
  };

  reviews.set(newReview.id, newReview);

  if (willReveal && counterpartyReview) {
    counterpartyReview.isRevealed = true;
    counterpartyReview.revealedAt = nowIso;

    // Recalculate reputation score for both parties
    recalculateUserReputation(reviewerId);
    recalculateUserReputation(revieweeId);

    // Automatically purge physical pickup details post double-blind reveal
    purgeTaskPrivacyData(taskId);
  }

  return {
    success: true,
    review: newReview,
    isRevealed: willReveal,
    doubleBlindComplete: willReveal,
  };
}

export function getTaskReviewStatus(
  taskId: string,
  viewerUserId?: string
): { success: boolean; status?: TaskReviewStatus; error?: string } {
  const task = tasks.get(taskId);
  if (!task) return { success: false, error: 'Task not found.' };

  const taskReviews: TaskReview[] = [];
  for (const r of reviews.values()) {
    if (r.taskId === taskId) {
      taskReviews.push(r);
    }
  }

  const requesterReview = taskReviews.find(r => r.reviewerId === task.requesterId);
  const helperReview = taskReviews.find(r => r.reviewerId === task.acceptedHelperId);

  const requesterReviewed = !!requesterReview;
  const helperReviewed = !!helperReview;
  const isRevealed = (requesterReviewed && helperReviewed) || taskReviews.some(r => r.isRevealed);

  const userReview = viewerUserId ? taskReviews.find(r => r.reviewerId === viewerUserId) : undefined;
  const hasUserReviewed = !!userReview;

  // Double-Blind protection: Only expose counterpart's review if both reviewed (isRevealed)
  const revealedReviews = isRevealed ? taskReviews : (userReview ? [userReview] : []);

  const isPrivacyPurged = !task.pickupAddressEncrypted || task.pickupAddressEncrypted.includes('[PURGED');

  return {
    success: true,
    status: {
      taskId,
      requesterReviewed,
      helperReviewed,
      isRevealed,
      hasUserReviewed,
      userReview,
      revealedReviews,
      isPrivacyPurged,
    },
  };
}

// Seed initial authentic neighbor reviews for demonstration
function seedInitialReviews() {
  if (reviews.size > 0) return;

  const now = new Date();
  const seedReviewData: Array<Omit<TaskReview, 'id'>> = [
    {
      taskId: 'tsk_seed_historical_1',
      reviewerId: 'a1b2c3d4-0002-4000-8000-000000000002', // Can
      reviewerName: 'Can Özdemir',
      reviewerAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      revieweeId: 'a1b2c3d4-0001-4000-8000-000000000001', // Deniz
      rating: 5,
      comment: 'Super fast delivery from Moda pharmacy! Handed over right on time at the door with verified OTP code.',
      isRevealed: true,
      isSybilCapped: false,
      createdAt: new Date(now.getTime() - 5 * 86400000).toISOString(),
      revealedAt: new Date(now.getTime() - 5 * 86400000).toISOString(),
    },
    {
      taskId: 'tsk_seed_historical_2',
      reviewerId: 'a1b2c3d4-0004-4000-8000-000000000004', // Leyla
      reviewerName: 'Leyla Acar',
      reviewerAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
      revieweeId: 'a1b2c3d4-0001-4000-8000-000000000001', // Deniz
      rating: 5,
      comment: 'Carried fragile ceramic workshop items with extreme care. Wonderful neighborhood spirit!',
      isRevealed: true,
      isSybilCapped: false,
      createdAt: new Date(now.getTime() - 12 * 86400000).toISOString(),
      revealedAt: new Date(now.getTime() - 12 * 86400000).toISOString(),
    },
    {
      taskId: 'tsk_seed_historical_3',
      reviewerId: 'a1b2c3d4-0001-4000-8000-000000000001', // Deniz
      reviewerName: 'Deniz Kaya',
      reviewerAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      revieweeId: 'a1b2c3d4-0003-4000-8000-000000000003', // Zeynep
      rating: 5,
      comment: 'Very clear pickup instructions and immediate reimbursement upon receipt verification. Pleasure helping Zeynep!',
      isRevealed: true,
      isSybilCapped: false,
      createdAt: new Date(now.getTime() - 3 * 86400000).toISOString(),
      revealedAt: new Date(now.getTime() - 3 * 86400000).toISOString(),
    },
  ];

  for (const sr of seedReviewData) {
    const id = `rev_seed_${Math.random().toString(36).substring(2, 7)}`;
    reviews.set(id, { id, ...sr });
  }
}

// Run initial seeding
initializeStorage();
seedInitialReviews();



