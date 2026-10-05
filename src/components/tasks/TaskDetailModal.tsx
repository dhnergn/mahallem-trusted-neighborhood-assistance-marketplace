import React, { useState } from 'react';
import {
  X,
  MapPin,
  Clock,
  ShieldCheck,
  Lock,
  ArrowRight,
  Eye,
  AlertCircle,
  CheckCircle2,
  Package,
  Send,
  Heart,
} from 'lucide-react';
import { TaskDiscoveryCard } from '../../types/index.ts';
import { TrustBadge } from '../trust/TrustBadge.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { SubmitOfferModal } from './SubmitOfferModal.tsx';

interface TaskDetailModalProps {
  task: TaskDiscoveryCard | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenRequesterTrust: (userId: string) => void;
  onOfferHelp?: (taskId: string) => void;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  task,
  isOpen,
  onClose,
  onOpenRequesterTrust,
  onOfferHelp,
}) => {
  const { user } = useAuth();
  const [offerSent, setOfferSent] = useState(false);
  const [isSubmitOfferOpen, setIsSubmitOfferOpen] = useState(false);

  if (!isOpen || !task) return null;

  const isOwnTask = user?.id === task.requester.id;

  const handleOfferSuccess = () => {
    setOfferSent(true);
    if (onOfferHelp) {
      onOfferHelp(task.id);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-lg">
              {task.categoryId.replace('-', ' ')}
            </span>
            <span className="text-xs font-semibold text-slate-500 bg-white border border-slate-200 px-2.5 py-1 rounded-lg">
              Status: {task.status}
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Title & Reward */}
          <div className="flex items-start justify-between gap-4">
            <h2 className="text-xl font-extrabold text-slate-900 leading-snug">
              {task.title}
            </h2>
            {task.rewardCents > 0 && (
              <div className="text-right shrink-0">
                <span className="text-lg font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-xl inline-block">
                  ₺{(task.rewardCents / 100).toFixed(0)}
                </span>
                <p className="text-[10px] text-slate-400 mt-0.5">Voluntary gratitude</p>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="text-sm text-slate-700 leading-relaxed bg-slate-50/70 p-4 rounded-xl border border-slate-100">
            {task.description}
          </div>

          {/* Route & Approximate Locations */}
          <div className="p-4 rounded-xl border border-slate-200 space-y-3 bg-white">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Neighborhood Trajectory
            </h4>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs text-slate-400 font-medium">Pickup Zone</span>
                <p className="text-sm font-bold text-slate-800">
                  {task.neighborhood}, {task.district}
                </p>
              </div>
            </div>

            {task.destinationDistrict && (
              <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
                <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                  <ArrowRight className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs text-slate-400 font-medium">Drop-Off Destination</span>
                  <p className="text-sm font-bold text-slate-800">
                    {task.destinationNeighborhood || task.destinationDistrict}, {task.destinationDistrict}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Privacy Notice Shield */}
          <div className="p-3.5 rounded-xl bg-slate-900 text-white flex items-start gap-3 shadow-xs">
            <Lock className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-300 leading-relaxed">
              <strong className="text-white">Privacy-by-Design Location Shield:</strong> The location shown is an approximate centroid (~500m jitter). Precise pickup building and apartment notes remain encrypted and will strictly be revealed to the assigned helper once mutual agreement is confirmed in Phase 4.
            </div>
          </div>

          {/* Open Inspection Protocol Box */}
          <div className="p-3.5 rounded-xl bg-teal-50 border border-teal-200 flex items-start gap-3">
            <Eye className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
            <div className="text-xs text-teal-900 leading-relaxed">
              <strong className="text-teal-950">Mandatory Open Inspection Protocol:</strong> Both neighbors must inspect any physical items together prior to handover. Sealed or unknown contents are strictly prohibited on the platform.
            </div>
          </div>

          {/* Requester Profile Summary Card */}
          <div className="p-4 rounded-xl border border-slate-200 flex items-center justify-between bg-slate-50">
            <div className="flex items-center gap-3">
              <img
                src={task.requester.avatarUrl}
                alt={task.requester.displayName}
                className="w-12 h-12 rounded-xl object-cover ring-1 ring-slate-300 shadow-xs"
              />
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-slate-900">
                    {task.requester.displayName}
                  </span>
                  {task.requester.isIdVerified && (
                    <span title="Government ID Verified">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {task.requester.neighborhood} • {task.requester.tasksCompletedCount} completed tasks
                </div>
              </div>
            </div>

            <button
              onClick={() => onOpenRequesterTrust(task.requester.id)}
              className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:text-emerald-700 hover:border-emerald-300 text-xs font-semibold shadow-2xs transition-colors"
            >
              Trust Profile
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/70 rounded-xl transition-colors"
          >
            Close
          </button>

          {isOwnTask ? (
            <span className="text-xs font-medium text-slate-500 italic">
              This is your own neighborhood request
            </span>
          ) : offerSent ? (
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Offer Submitted to Neighbor!</span>
            </div>
          ) : (
            <button
              onClick={() => setIsSubmitOfferOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition-colors flex items-center gap-2"
            >
              <Heart className="w-4 h-4" />
              <span>I Can Help With This</span>
            </button>
          )}
        </div>
      </div>

      <SubmitOfferModal
        task={task}
        isOpen={isSubmitOfferOpen}
        onClose={() => setIsSubmitOfferOpen(false)}
        onOfferSubmitted={handleOfferSuccess}
      />
    </div>
  );
};
