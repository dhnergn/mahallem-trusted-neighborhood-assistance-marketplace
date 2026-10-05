import { SecurityAuditLog } from '../types/index.ts';

// In-memory append-only audit ledger (in production stored in dedicated append-only tables / BigQuery / Cloud Logging)
const auditLogs: SecurityAuditLog[] = [];
const MAX_LOGS = 1000;

export function recordAuditLog(log: Omit<SecurityAuditLog, 'id' | 'createdAt'>): SecurityAuditLog {
  const entry: SecurityAuditLog = {
    ...log,
    id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    createdAt: new Date().toISOString(),
  };

  auditLogs.unshift(entry);
  if (auditLogs.length > MAX_LOGS) {
    auditLogs.pop();
  }

  // Never log passwords, auth tokens, or sensitive unmasked PII
  return entry;
}

export function getRecentAuditLogs(limit: number = 50, actorId?: string): SecurityAuditLog[] {
  if (actorId) {
    return auditLogs.filter(l => l.actorId === actorId).slice(0, limit);
  }
  return auditLogs.slice(0, limit);
}
