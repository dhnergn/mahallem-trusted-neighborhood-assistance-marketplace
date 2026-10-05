import {
  User,
  PublicTrustProfile,
  SecurityAuditLog,
  Task,
  TaskDiscoveryCard,
  CreateTaskInput,
  TaskOffer,
  SubmitOfferInput,
  TaskStatus,
  ChatMessage,
  TaskConversation,
  SubmitReportInput,
  UserReport,
  UserBlock,
  TaskReview,
  TaskReviewStatus,
  SubmitReviewInput,
} from '../types/index.ts';
import { TaskCategory } from '../lib/task-policy.ts';
import { NeighborhoodLocation } from '../lib/geo.ts';

const TOKEN_KEY = 'mahallem_session_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});

  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`/api${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    const errorMsg = data?.error?.message || `Request failed with status ${response.status}`;
    throw new Error(errorMsg);
  }

  return data as T;
}

export const api = {
  // Auth
  requestOtp: (identifier: string, type: 'phone' | 'email') =>
    apiFetch<{ success: boolean; message: string; debugCode?: string }>('/auth/request-otp', {
      method: 'POST',
      body: JSON.stringify({ identifier, type }),
    }),

  verifyOtp: (identifier: string, code: string) =>
    apiFetch<{ success: boolean; token: string; user: User; trustProfile: PublicTrustProfile }>(
      '/auth/verify-otp',
      {
        method: 'POST',
        body: JSON.stringify({ identifier, code }),
      }
    ),

  getMe: () =>
    apiFetch<{ authenticated: boolean; user: User | null; trustProfile: PublicTrustProfile | null }>(
      '/auth/me'
    ),

  logout: () =>
    apiFetch<{ success: boolean }>('/auth/logout', {
      method: 'POST',
    }),

  switchAccount: (targetUserId: string) =>
    apiFetch<{ success: boolean; token: string; user: User; trustProfile: PublicTrustProfile }>(
      '/auth/switch-account',
      {
        method: 'POST',
        body: JSON.stringify({ targetUserId }),
      }
    ),

  // Neighbors & Trust
  getNeighbors: () =>
    apiFetch<{ neighbors: Array<Pick<User, 'id' | 'displayName' | 'avatarUrl' | 'role' | 'neighborhood' | 'district'> & { isIdVerified: boolean }> }>(
      '/users/neighbors'
    ),

  getTrustProfile: (userId: string) =>
    apiFetch<{ trustProfile: PublicTrustProfile }>(`/users/${userId}/trust-profile`),

  // Security Audit
  getAuditLogs: () =>
    apiFetch<{ logs: SecurityAuditLog[] }>('/audit-logs'),

  // Tasks & Discovery (Phase 3)
  getCategories: () =>
    apiFetch<{ categories: TaskCategory[] }>('/categories'),

  getNeighborhoods: () =>
    apiFetch<{ neighborhoods: Record<string, NeighborhoodLocation> }>('/neighborhoods'),

  getTasks: (params?: { category?: string; district?: string; radius?: number; lat?: number; lng?: number }) => {
    const query = new URLSearchParams();
    if (params?.category) query.set('category', params.category);
    if (params?.district) query.set('district', params.district);
    if (params?.radius) query.set('radius', params.radius.toString());
    if (params?.lat) query.set('lat', params.lat.toString());
    if (params?.lng) query.set('lng', params.lng.toString());
    const qs = query.toString();
    return apiFetch<{ tasks: TaskDiscoveryCard[]; count: number }>(`/tasks${qs ? `?${qs}` : ''}`);
  },

  getTask: (id: string) =>
    apiFetch<{ task: Partial<Task>; canViewExactDetails: boolean }>(`/tasks/${id}`),

  createTask: (data: CreateTaskInput) =>
    apiFetch<{ success: boolean; message: string; task: Task }>('/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Phase 4: Matching & Handover OTP
  submitOffer: (taskId: string, data: SubmitOfferInput) =>
    apiFetch<{ success: boolean; message: string; offer: TaskOffer }>(`/tasks/${taskId}/offers`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getTaskOffers: (taskId: string) =>
    apiFetch<{ offers: TaskOffer[] }>(`/tasks/${taskId}/offers`),

  acceptOffer: (taskId: string, offerId: string) =>
    apiFetch<{ success: boolean; message: string; task: Task; completionOtp?: string }>(
      `/tasks/${taskId}/offers/${offerId}/accept`,
      {
        method: 'POST',
      }
    ),

  transitionTask: (taskId: string, targetStatus: TaskStatus, reason?: string) =>
    apiFetch<{ success: boolean; message: string; task: Task }>(`/tasks/${taskId}/transition`, {
      method: 'POST',
      body: JSON.stringify({ targetStatus, reason }),
    }),

  completeHandover: (taskId: string, otpCode: string) =>
    apiFetch<{ success: boolean; message: string; task: Task }>(`/tasks/${taskId}/complete-handover`, {
      method: 'POST',
      body: JSON.stringify({ otpCode }),
    }),

  getMyTasks: () =>
    apiFetch<{
      requested: Array<Task & { completionOtp?: string }>;
      helping: Task[];
    }>('/my-tasks'),

  // Phase 5: Ephemeral Chat & Moderation
  getConversation: (taskId: string) =>
    apiFetch<{ conversation: TaskConversation }>(`/tasks/${taskId}/conversation`),

  sendMessage: (taskId: string, content: string) =>
    apiFetch<{ success: boolean; message: ChatMessage }>(`/tasks/${taskId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),

  submitReport: (data: SubmitReportInput) =>
    apiFetch<{ success: boolean; message: string; reportId: string }>('/reports', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  blockUser: (userId: string, reason?: string) =>
    apiFetch<{ success: boolean; message: string; block: UserBlock }>(`/users/${userId}/block`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  getBlockedUsers: () =>
    apiFetch<{ blockedUsers: UserBlock[] }>('/users/blocked'),

  // Phase 6: Double-Blind Reviews, Reputation & Privacy Purge
  submitReview: (taskId: string, data: SubmitReviewInput) =>
    apiFetch<{
      success: boolean;
      message: string;
      review: TaskReview;
      isRevealed: boolean;
      doubleBlindComplete: boolean;
    }>(`/tasks/${taskId}/reviews`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getTaskReviewStatus: (taskId: string) =>
    apiFetch<{ success: boolean; status: TaskReviewStatus }>(`/tasks/${taskId}/reviews`),

  getUserReviews: (userId: string) =>
    apiFetch<{ reviews: TaskReview[] }>(`/users/${userId}/reviews`),

  purgeTaskPrivacy: (taskId: string) =>
    apiFetch<{ success: boolean; message: string }>(`/tasks/${taskId}/purge-privacy`, {
      method: 'POST',
    }),
};
