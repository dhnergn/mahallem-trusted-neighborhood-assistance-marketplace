import React, { useState } from 'react';
import {
  X,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { api } from '../../api/client.ts';
import { Task } from '../../types/index.ts';

interface HandoverOtpModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onCompleted: (task: Task) => void;
}

export const HandoverOtpModal: React.FC<HandoverOtpModalProps> = ({
  task,
  isOpen,
  onClose,
  onCompleted,
}) => {
  const [otpCode, setOtpCode] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !task) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length !== 6) {
      setErrorMsg('Please enter the complete 6-digit code.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await api.completeHandover(task.id, otpCode);
      if (res.success) {
        onCompleted(res.task);
        onClose();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid handover code.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-emerald-50/70">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-600 text-white shadow-xs">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Physical Handover Verification</h3>
              <p className="text-xs text-slate-500">Mutual drop-off code confirmation</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Task Info */}
        <div className="p-4 bg-slate-50 border-b border-slate-100 text-xs text-slate-600">
          Completing delivery for: <strong className="text-slate-900">{task.title}</strong>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-rose-800 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="text-center space-y-2">
            <p className="text-xs text-slate-600 leading-relaxed">
              Ask the recipient for the <strong>6-digit Handover Code</strong> displayed on their screen upon physical receipt of the parcel.
            </p>

            <div className="pt-2">
              <input
                type="text"
                maxLength={6}
                value={otpCode}
                onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
                placeholder="••••••"
                autoFocus
                required
                className="w-48 mx-auto text-center tracking-widest font-mono text-2xl py-2 px-3 rounded-xl border-2 border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/20 shadow-xs"
              />
            </div>
            <p className="text-[11px] text-slate-400">
              Only enter code after physical inspection and item handover.
            </p>
          </div>

          <div className="pt-3 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || otpCode.length !== 6}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              {isSubmitting ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Confirm Handover</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
