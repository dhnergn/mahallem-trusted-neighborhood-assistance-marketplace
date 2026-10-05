import React, { useState, useEffect } from 'react';
import { X, ShieldAlert, RefreshCw, Terminal, Clock, Lock } from 'lucide-react';
import { SecurityAuditLog } from '../../types/index.ts';
import { api } from '../../api/client.ts';

interface AuditLogDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuditLogDrawer: React.FC<AuditLogDrawerProps> = ({ isOpen, onClose }) => {
  const [logs, setLogs] = useState<SecurityAuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const res = await api.getAuditLogs();
      setLogs(res.logs);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchLogs();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs">
      <div className="bg-slate-900 text-slate-100 w-full max-w-lg h-full shadow-2xl flex flex-col border-l border-slate-800 animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-100">Immutable Security Audit Ledger</h3>
              <p className="text-xs text-slate-400">Append-only security & authorization trail</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchLogs}
              disabled={isLoading}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              title="Refresh ledger"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Notice */}
        <div className="p-3 bg-slate-800/50 border-b border-slate-800 flex items-start gap-2.5 text-xs text-slate-300">
          <Lock className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <span>
            Every authentication event, state change, and rate-limit tripwire is immutably recorded with salted IP and actor hashes.
          </span>
        </div>

        {/* Log list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-xs">
          {logs.length === 0 ? (
            <div className="text-center py-12 text-slate-500">No audit events recorded yet.</div>
          ) : (
            logs.map(log => {
              const isError = log.eventType.includes('LIMIT') || log.eventType.includes('FAILED') || log.eventType.includes('LOCKOUT');
              const isSuccess = log.eventType.includes('SUCCESS');

              return (
                <div
                  key={log.id}
                  className={`p-3 rounded-xl border transition-all ${
                    isError
                      ? 'bg-rose-950/30 border-rose-800/50 text-rose-200'
                      : isSuccess
                      ? 'bg-emerald-950/30 border-emerald-800/50 text-emerald-200'
                      : 'bg-slate-800/40 border-slate-800 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className={`font-semibold px-2 py-0.5 rounded text-[11px] ${
                        isError
                          ? 'bg-rose-900/60 text-rose-300'
                          : isSuccess
                          ? 'bg-emerald-900/60 text-emerald-300'
                          : 'bg-slate-700 text-slate-200'
                      }`}
                    >
                      {log.eventType}
                    </span>
                    <span className="text-[10px] text-slate-400 flex items-center gap-1 font-sans">
                      <Clock className="w-3 h-3" />
                      {new Date(log.createdAt).toLocaleTimeString()}
                    </span>
                  </div>

                  <div className="space-y-1 text-[11px] opacity-90">
                    <div>
                      <span className="text-slate-500">Resource:</span> {log.resourceType}:
                      <span className="text-slate-300">{log.resourceId.substring(0, 14)}...</span>
                    </div>
                    <div>
                      <span className="text-slate-500">IP Hash:</span> {log.ipHash}
                    </div>
                    {Object.keys(log.metadata).length > 0 && (
                      <div className="text-slate-400 mt-1 pt-1 border-t border-slate-800/60">
                        {JSON.stringify(log.metadata)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
