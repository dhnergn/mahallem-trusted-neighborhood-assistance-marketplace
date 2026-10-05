import { TaskStatus, UserRole } from '../types/index.ts';

export interface StateTransitionResult {
  valid: boolean;
  error?: string;
}

// Matrix defining authorized transitions and required roles
export const ALLOWED_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  OPEN: ['MATCHED', 'CANCELLED', 'EXPIRED'],
  MATCHED: ['ACCEPTED', 'OPEN', 'CANCELLED'],
  ACCEPTED: ['IN_PROGRESS', 'CANCELLED', 'DISPUTED'],
  IN_PROGRESS: ['COMPLETED', 'DISPUTED', 'CANCELLED'],
  COMPLETED: ['CONFIRMED'],
  CONFIRMED: [],
  CANCELLED: [],
  EXPIRED: [],
  DISPUTED: ['COMPLETED', 'CANCELLED'],
};

/**
 * Validates whether a state transition is legal according to the finite state machine
 * and verifies that the calling actor has the necessary relationship to the task.
 */
export function validateTaskTransition(
  currentStatus: TaskStatus,
  targetStatus: TaskStatus,
  actor: {
    userId: string;
    role: UserRole;
  },
  task: {
    requesterId: string;
    acceptedHelperId?: string;
  }
): StateTransitionResult {
  // 1. Is transition allowed by state machine topology?
  const allowedTargets = ALLOWED_TRANSITIONS[currentStatus] || [];
  if (!allowedTargets.includes(targetStatus)) {
    return {
      valid: false,
      error: `Invalid transition from "${currentStatus}" to "${targetStatus}".`,
    };
  }

  // 2. Role and Relationship Authorization
  const isRequester = actor.userId === task.requesterId;
  const isAcceptedHelper = Boolean(task.acceptedHelperId && actor.userId === task.acceptedHelperId);
  const isModerator = actor.role === 'MODERATOR' || actor.role === 'ADMIN';

  if (isModerator) {
    return { valid: true }; // Moderators can intervene on disputes/cancellations
  }

  // Requester accepting helper offer: OPEN -> MATCHED or MATCHED -> ACCEPTED
  if (targetStatus === 'MATCHED' || targetStatus === 'ACCEPTED') {
    if (!isRequester) {
      return {
        valid: false,
        error: 'Only the task requester can accept an offer and confirm the agreement.',
      };
    }
  }

  // Helper starting transit: ACCEPTED -> IN_PROGRESS
  if (targetStatus === 'IN_PROGRESS') {
    if (!isAcceptedHelper) {
      return {
        valid: false,
        error: 'Only the assigned helper can mark the task as in-progress.',
      };
    }
  }

  // Completing task: IN_PROGRESS -> COMPLETED (requires completion OTP verification)
  if (targetStatus === 'COMPLETED') {
    if (!isAcceptedHelper && !isRequester) {
      return {
        valid: false,
        error: 'Only the matched helper or requester can complete the task handover.',
      };
    }
  }

  // Cancellation authorization
  if (targetStatus === 'CANCELLED') {
    if (!isRequester && !isAcceptedHelper) {
      return {
        valid: false,
        error: 'Only direct task participants can cancel this request.',
      };
    }
  }

  return { valid: true };
}
