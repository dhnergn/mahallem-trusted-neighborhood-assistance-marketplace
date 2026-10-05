import React, { useState } from 'react';
import {
  X,
  Flag,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react';
import { ReportCategory } from '../../types/index.ts';
import { api } from '../../api/client.ts';

interface ReportModalProps {
  reportedUserId?: string;
  reportedTaskId?: string;
  isOpen: boolean;
  onClose: () => void;
}

const REPORT_CATEGORIES: Array<{ id: ReportCategory; label: string; desc: string }> = [
  {
    id: 'PROHIBITED_GOODS',
    label: 'Prohibited or Uninspected Goods',
    desc: 'Sealed package without inspection, weapons, drugs, or illegal contraband.',
  },
  {
    id: 'HARASSMENT',
    label: 'Harassment or Offensive Behavior',
    desc: 'Abusive language, stalking, or inappropriate requests.',
  },
  {
    id: 'FRAUD_THEFT',
    label: 'Fraud or Theft Attempt',
    desc: 'Item not delivered, off-platform payment scam, or impersonation.',
  },
  {
    id: 'SAFETY_CONCERN',
    label: 'Physical Safety Concern',
    desc: 'Unsafe rendezvous location, aggression, or dangerous circumstances.',
  },
  {
    id: 'SPAM',
    label: 'Spam or Bot Activity',
    desc: 'Automated spam, fake requests, or repetitive messages.',
  },
];

export const ReportModal: React.FC<ReportModalProps> = ({
  reportedUserId,
  reportedTaskId,
  isOpen,
  onClose,
}) => {
  const [category, setCategory] = useState<ReportCategory>('PROHIBITED_GOODS');
  const [description, setDescription] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (description.trim().length < 5) {
      setErrorMsg('Please describe what happened (at least 5 characters).');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await api.submitReport({
        reportedUserId,
        reportedTaskId,
        category,
        description: description.trim(),
      });
      setSuccessMsg(res.message);
      setTimeout(() => {
        onClose();
        setSuccessMsg(null);
        setDescription('');
      }, 2500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit report.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-rose-50/70">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-rose-600 text-white shadow-xs">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Report Safety Violation</h3>
              <p className="text-xs text-slate-500">Confidential neighborhood report</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {successMsg ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-slate-900 text-base">Report Submitted</h4>
            <p className="text-xs text-slate-600 leading-relaxed max-w-xs mx-auto">
              {successMsg} An immutable security event has been logged for moderator audit.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                Violation Category
              </label>
              <div className="space-y-2">
                {REPORT_CATEGORIES.map(cat => (
                  <div
                    key={cat.id}
                    onClick={() => setCategory(cat.id)}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      category === cat.id
                        ? 'border-rose-500 bg-rose-50/50 ring-1 ring-rose-400'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-bold text-xs text-slate-800">{cat.label}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">{cat.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Details & Context
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Explain what happened, including specific actions or message contents..."
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500"
                required
                maxLength={500}
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Flag className="w-3.5 h-3.5" />
                    <span>Submit Report</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
