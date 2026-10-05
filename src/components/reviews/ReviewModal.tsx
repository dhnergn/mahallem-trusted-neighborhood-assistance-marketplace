import React, { useState, useEffect } from 'react';
import {
  X,
  Star,
  Shield,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Lock,
  Sparkles,
} from 'lucide-react';
import { TaskReviewStatus, TaskReview } from '../../types/index.ts';
import { api } from '../../api/client.ts';

interface ReviewModalProps {
  taskId: string | null;
  taskTitle?: string;
  counterpartName?: string;
  isOpen: boolean;
  onClose: () => void;
  onReviewSubmitted?: () => void;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  taskId,
  taskTitle,
  counterpartName,
  isOpen,
  onClose,
  onReviewSubmitted,
}) => {
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [reviewStatus, setReviewStatus] = useState<TaskReviewStatus | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchStatus = async () => {
    if (!taskId) return;
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await api.getTaskReviewStatus(taskId);
      setReviewStatus(res.status);
      if (res.status.userReview) {
        setRating(res.status.userReview.rating);
        setComment(res.status.userReview.comment);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to fetch review status.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && taskId) {
      fetchStatus();
      setSuccessMsg(null);
    }
  }, [isOpen, taskId]);

  if (!isOpen || !taskId) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (comment.trim().length < 3) {
      setErrorMsg('Please write a brief feedback comment (at least 3 characters).');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await api.submitReview(taskId, {
        rating,
        comment: comment.trim(),
      });

      setSuccessMsg(res.message);
      if (onReviewSubmitted) onReviewSubmitted();
      await fetchStatus();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit review.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const RATING_LABELS: Record<number, string> = {
    1: 'Unsatisfactory experience',
    2: 'Several issues encountered',
    3: 'Satisfactory / Acceptable',
    4: 'Great neighborly help!',
    5: 'Outstanding, trusted neighbor! ⭐',
  };

  const activeRating = hoverRating || rating;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-amber-50/60">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500 text-white shadow-xs">
              <EyeOff className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Double-Blind Review</h3>
              <p className="text-xs text-slate-500">Unbiased neighbor feedback</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Double-Blind Educational Banner */}
        <div className="p-3.5 bg-slate-50 border-b border-slate-100 text-xs text-slate-600 flex items-start gap-2.5">
          <Shield className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <span className="font-semibold text-slate-800">Retaliation-Proof:</span> Your review remains completely hidden until both parties have submitted or 7 days pass. Once revealed, sensitive building pickup data is permanently purged.
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          {isLoading ? (
            <div className="py-12 text-center text-xs text-slate-400">Loading review state...</div>
          ) : reviewStatus?.isRevealed ? (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-semibold">Double-Blind Complete! Both reviews are now revealed.</span>
              </div>

              {reviewStatus.revealedReviews?.map(r => (
                <div key={r.id} className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-800">{r.reviewerName}</span>
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map(star => (
                        <Star
                          key={star}
                          className={`w-3.5 h-3.5 ${
                            star <= r.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 italic">"{r.comment}"</p>
                  {r.isSybilCapped && (
                    <span className="inline-block text-[10px] text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded font-mono">
                      Collusion Cap: High-frequency repeat interaction normalized
                    </span>
                  )}
                </div>
              ))}

              {reviewStatus.isPrivacyPurged && (
                <div className="text-[11px] text-slate-400 text-center font-mono">
                  🛡️ Physical pickup address & coordinates permanently purged for safety.
                </div>
              )}

              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors"
              >
                Close
              </button>
            </div>
          ) : reviewStatus?.hasUserReviewed ? (
            /* User already reviewed, waiting on counterparty */
            <div className="space-y-4 text-center py-4">
              <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Review Submitted Privately</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto leading-relaxed">
                  Your feedback is securely sealed. As soon as {counterpartName || 'your neighbor'} submits their review, both will be revealed simultaneously.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-left space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-600">Your Sealed Rating:</span>
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map(star => (
                      <Star
                        key={star}
                        className={`w-3.5 h-3.5 ${
                          star <= (reviewStatus.userReview?.rating || 5)
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-slate-200'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <p className="text-xs text-slate-700 italic">"{reviewStatus.userReview?.comment}"</p>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
              >
                Done
              </button>
            </div>
          ) : (
            /* Form to submit review */
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {taskTitle && (
                <div className="text-xs text-slate-500">
                  Task: <span className="font-semibold text-slate-800">{taskTitle}</span>
                </div>
              )}

              {/* Star Rating */}
              <div className="text-center py-2 space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Rate Neighbor Experience
                </label>
                <div className="flex items-center justify-center gap-2">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="p-1 hover:scale-115 transition-transform"
                    >
                      <Star
                        className={`w-7 h-7 transition-colors ${
                          star <= activeRating
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-slate-200 hover:text-amber-200'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                <div className="text-xs font-medium text-amber-700">
                  {RATING_LABELS[activeRating] || 'Select rating'}
                </div>
              </div>

              {/* Review Comment */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Neighborhood Feedback
                </label>
                <textarea
                  rows={3}
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  placeholder="Describe communication, punctuality, and handling of the handover..."
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  required
                  maxLength={500}
                />
              </div>

              {/* Sybil note */}
              <div className="text-[11px] text-slate-400 flex items-center gap-1.5 font-mono">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>Sybil-resistant: Reputation caps repeated pairs to prevent farming.</span>
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
                  disabled={isSubmitting || !comment.trim()}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-md transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5" />
                      <span>Submit Sealed Review</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
