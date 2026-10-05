import React, { useState } from 'react';
import {
  X,
  Heart,
  Clock,
  ShieldCheck,
  Send,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { TaskDiscoveryCard } from '../../types/index.ts';
import { api } from '../../api/client.ts';
import { useAuth } from '../../context/AuthContext.tsx';

interface SubmitOfferModalProps {
  task: TaskDiscoveryCard | null;
  isOpen: boolean;
  onClose: () => void;
  onOfferSubmitted: () => void;
}

export const SubmitOfferModal: React.FC<SubmitOfferModalProps> = ({
  task,
  isOpen,
  onClose,
  onOfferSubmitted,
}) => {
  const { user } = useAuth();
  const [message, setMessage] = useState<string>('I am heading that direction and can carry this safely for you!');
  const [estimatedArrivalMinutes, setEstimatedArrivalMinutes] = useState<number>(30);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !task) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || message.trim().length < 5) {
      setErrorMsg('Please include a brief note (at least 5 characters).');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      await api.submitOffer(task.id, {
        message: message.trim(),
        estimatedArrivalMinutes: Number(estimatedArrivalMinutes) || 30,
      });
      onOfferSubmitted();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit offer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
              <Heart className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Offer Neighborhood Help</h3>
              <p className="text-xs text-slate-500">Signal your availability to assist</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Task Summary Banner */}
        <div className="p-4 bg-emerald-50/50 border-b border-emerald-100/60 flex items-start gap-3">
          <div className="flex-1">
            <span className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider">
              Assisting with
            </span>
            <h4 className="text-xs font-bold text-slate-900 mt-0.5 line-clamp-1">
              {task.title}
            </h4>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Requester: <strong className="text-slate-700">{task.requester.displayName}</strong> ({task.neighborhood})
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2 text-rose-700 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Personal Note to Neighbor
            </label>
            <textarea
              rows={3}
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="e.g. I am taking the 15:45 ferry and can meet you outside the station..."
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
              maxLength={300}
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Estimated Pickup Time
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[15, 30, 60].map(mins => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setEstimatedArrivalMinutes(mins)}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition-colors flex items-center justify-center gap-1 ${
                    estimatedArrivalMinutes === mins
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Clock className="w-3 h-3" />
                  <span>{mins} mins</span>
                </button>
              ))}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-[11px] text-slate-500 leading-relaxed">
            <span className="font-semibold text-slate-700">Safety Flow:</span> Your verified trust profile will be sent to the requester. If accepted, the precise pickup address will be unlocked and a 6-digit physical handover code will be generated.
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
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              {isSubmitting ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Offer</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
