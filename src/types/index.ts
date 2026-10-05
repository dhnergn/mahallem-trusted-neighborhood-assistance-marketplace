import { z } from 'zod';

// ==========================================
// USER & TRUST ENUMS & TYPES
// ==========================================

export type UserRole = 'USER' | 'VERIFIED_NEIGHBOR' | 'MODERATOR' | 'ADMIN';
export type AccountStatus = 'PENDING_VERIFICATION' | 'ACTIVE' | 'RESTRICTED' | 'SUSPENDED';

export interface User {
  id: string;
  phoneHash: string;
  phoneMasked: string;
  emailMasked: string;
  displayName: string;
  avatarUrl: string;
  role: UserRole;
  status: AccountStatus;
  neighborhood: string;
  district: string;
  idVerifiedAt: string | null;
  phoneVerifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserTrustMetrics {
  userId: string;
  tasksRequestedCount: number;
  tasksCompletedCount: number;
  tasksCancelledCount: number;
  disputesCount: number;
  positiveRatingsCount: number;
  totalRatingsCount: number;
  reputationScore: number; // e.g. 98.5 (%)
  completionRate: number; // e.g. 96 (%)
  categoryExperience: Record<string, number>;
  memberSince: string;
}

export interface PublicTrustProfile {
  userId: string;
  displayName: string;
  avatarUrl: string;
  role: UserRole;
  neighborhood: string;
  district: string;
  isIdVerified: boolean;
  isPhoneVerified: boolean;
  tasksCompletedCount: number;
  completionRate: number;
  reputationScore: number;
  memberSince: string;
  badges: string[];
  categoryBreakdown: { categoryId: string; categoryName: string; completed: number }[];
  reviews?: TaskReview[];
  reviewsCount?: number;
}

export interface AuthSession {
  token: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
  lastActiveAt: string;
}

export interface SecurityAuditLog {
  id: string;
  actorId: string | null;
  eventType: string;
  resourceType: string;
  resourceId: string;
  ipHash: string;
  userAgentMasked: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

// ==========================================
// ZOD VALIDATION SCHEMAS
// ==========================================

export const RequestOtpSchema = z.object({
  identifier: z.string().min(5).max(100), // phone or email
  type: z.enum(['phone', 'email']),
});

export const VerifyOtpSchema = z.object({
  identifier: z.string().min(5).max(100),
  code: z.string().length(6).regex(/^\d+$/, 'Code must be 6 digits'),
});

export const SwitchAccountSchema = z.object({
  targetUserId: z.string().uuid(),
});

export type RequestOtpInput = z.infer<typeof RequestOtpSchema>;
export type VerifyOtpInput = z.infer<typeof VerifyOtpSchema>;
export type SwitchAccountInput = z.infer<typeof SwitchAccountSchema>;

// ==========================================
// TASK & GEOLOCATION TYPES
// ==========================================

export type TaskStatus =
  | 'OPEN'
  | 'MATCHED'
  | 'ACCEPTED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CONFIRMED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'DISPUTED';

export interface Task {
  id: string;
  requesterId: string;
  categoryId: string;
  title: string;
  description: string;
  status: TaskStatus;
  
  // Public Coarse Discovery Area
  district: string;
  neighborhood: string;
  coarseLat: number;
  coarseLng: number;
  
  // Optional route info
  destinationDistrict?: string;
  destinationNeighborhood?: string;

  // Sensitive pickup notes (withheld until matched & accepted)
  pickupAddressEncrypted?: string;
  pickupLat?: number;
  pickupLng?: number;

  // Compensation / voluntary gratitude (in Turkish Lira kuruş / cents)
  rewardCents: number;
  estimatedMinutes: number;

  // Safeguards
  openInspectionAgreed: boolean;
  moderationSource?: string;

  // Assignment
  acceptedHelperId?: string;
  completionOtpHmac?: string;

  // Timestamps & versioning
  expiresAt: string;
  matchedAt?: string;
  acceptedAt?: string;
  completedAt?: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface TaskDiscoveryCard {
  id: string;
  categoryId: string;
  title: string;
  description: string;
  status: TaskStatus;
  district: string;
  neighborhood: string;
  destinationDistrict?: string;
  destinationNeighborhood?: string;
  distanceKm: number;
  approxDistanceFormatted: string;
  rewardCents: number;
  estimatedMinutes: number;
  openInspectionAgreed: boolean;
  createdAt: string;
  requester: {
    id: string;
    displayName: string;
    avatarUrl: string;
    role: UserRole;
    neighborhood: string;
    isIdVerified: boolean;
    reputationScore: number;
    completionRate: number;
    tasksCompletedCount: number;
  };
}

export const CreateTaskSchema = z.object({
  categoryId: z.string().min(2).max(32),
  title: z.string().min(5, 'Title must be at least 5 characters').max(120),
  description: z.string().min(15, 'Please provide more details (at least 15 characters)').max(1000),
  neighborhoodKey: z.string().min(2).max(50), // Key from ISTANBUL_NEIGHBORHOODS
  destinationDistrict: z.string().max(50).optional(),
  destinationNeighborhood: z.string().max(50).optional(),
  pickupAddressSensitive: z.string().max(255).optional(), // Private: stored encrypted
  rewardLira: z.number().min(0).max(1000).default(0),
  estimatedMinutes: z.number().int().min(5).max(480).default(30),
  openInspectionAgreed: z.boolean().refine(val => val === true, {
    message: 'You must agree to the Open Package Inspection Protocol.',
  }),
});

export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;

// ==========================================
// OFFERS & STATE MACHINE TYPES (PHASE 4)
// ==========================================

export type OfferStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'WITHDRAWN';

export interface TaskOffer {
  id: string;
  taskId: string;
  helperId: string;
  message: string;
  estimatedArrivalMinutes: number;
  status: OfferStatus;
  createdAt: string;
  helper: {
    id: string;
    displayName: string;
    avatarUrl: string;
    role: UserRole;
    neighborhood: string;
    isIdVerified: boolean;
    reputationScore: number;
    completionRate: number;
    tasksCompletedCount: number;
  };
}

export const SubmitOfferSchema = z.object({
  message: z.string().min(5, 'Message must be at least 5 characters').max(300),
  estimatedArrivalMinutes: z.number().int().min(5).max(360).default(30),
});

export const TransitionTaskSchema = z.object({
  targetStatus: z.enum([
    'OPEN',
    'MATCHED',
    'ACCEPTED',
    'IN_PROGRESS',
    'COMPLETED',
    'CONFIRMED',
    'CANCELLED',
    'EXPIRED',
    'DISPUTED',
  ]),
  reason: z.string().max(300).optional(),
});

export const VerifyHandoverOtpSchema = z.object({
  otpCode: z.string().length(6).regex(/^\d+$/, 'Code must be 6 digits'),
});

export type SubmitOfferInput = z.infer<typeof SubmitOfferSchema>;
export type TransitionTaskInput = z.infer<typeof TransitionTaskSchema>;
export type VerifyHandoverOtpInput = z.infer<typeof VerifyHandoverOtpSchema>;

// ==========================================
// CHAT, MODERATION & ABUSE TYPES (PHASE 5)
// ==========================================

export interface ChatMessage {
  id: string;
  conversationId: string;
  taskId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  content: string;
  hasShieldedContent: boolean;
  flaggedReasons?: string[];
  createdAt: string;
}

export interface TaskConversation {
  id: string;
  taskId: string;
  taskTitle: string;
  taskStatus: TaskStatus;
  requesterId: string;
  helperId: string;
  otherParticipant: {
    id: string;
    displayName: string;
    avatarUrl: string;
    role: UserRole;
    neighborhood: string;
    isIdVerified: boolean;
    reputationScore: number;
  };
  isActive: boolean;
  messages: ChatMessage[];
}

export type ReportCategory =
  | 'PROHIBITED_GOODS'
  | 'HARASSMENT'
  | 'FRAUD_THEFT'
  | 'SAFETY_CONCERN'
  | 'SUSPICIOUS_IDENTITY'
  | 'SPAM';

export interface UserReport {
  id: string;
  reporterId: string;
  reportedUserId?: string;
  reportedTaskId?: string;
  category: ReportCategory;
  description: string;
  status: 'PENDING' | 'RESOLVED' | 'DISMISSED';
  createdAt: string;
}

export interface UserBlock {
  blockerId: string;
  blockedId: string;
  blockedName: string;
  reason?: string;
  createdAt: string;
}

export const SendMessageSchema = z.object({
  content: z.string().min(1, 'Message cannot be empty').max(500, 'Message cannot exceed 500 characters'),
});

export const SubmitReportSchema = z.object({
  reportedUserId: z.string().optional(),
  reportedTaskId: z.string().optional(),
  category: z.enum([
    'PROHIBITED_GOODS',
    'HARASSMENT',
    'FRAUD_THEFT',
    'SAFETY_CONCERN',
    'SUSPICIOUS_IDENTITY',
    'SPAM',
  ]),
  description: z.string().min(5, 'Please provide more details (at least 5 characters)').max(500),
});

export const BlockUserSchema = z.object({
  blockedUserId: z.string().min(1),
  reason: z.string().max(200).optional(),
});

export type SendMessageInput = z.infer<typeof SendMessageSchema>;
export type SubmitReportInput = z.infer<typeof SubmitReportSchema>;
export type BlockUserInput = z.infer<typeof BlockUserSchema>;

// ==========================================
// DOUBLE-BLIND REVIEWS & REPUTATION (PHASE 6)
// ==========================================

export interface TaskReview {
  id: string;
  taskId: string;
  reviewerId: string;
  reviewerName: string;
  reviewerAvatar: string;
  revieweeId: string;
  rating: number; // 1-5
  comment: string;
  isRevealed: boolean;
  isSybilCapped: boolean; // Flagged if capped due to >2 reviews between same pair in 30 days
  createdAt: string;
  revealedAt?: string;
}

export interface TaskReviewStatus {
  taskId: string;
  requesterReviewed: boolean;
  helperReviewed: boolean;
  isRevealed: boolean;
  hasUserReviewed: boolean;
  userReview?: TaskReview;
  revealedReviews?: TaskReview[];
  isPrivacyPurged: boolean;
}

export const SubmitReviewSchema = z.object({
  rating: z.number().int().min(1, 'Rating must be at least 1 star').max(5, 'Rating cannot exceed 5 stars'),
  comment: z.string().min(3, 'Please provide feedback of at least 3 characters').max(500, 'Comment cannot exceed 500 characters'),
});

export type SubmitReviewInput = z.infer<typeof SubmitReviewSchema>;



