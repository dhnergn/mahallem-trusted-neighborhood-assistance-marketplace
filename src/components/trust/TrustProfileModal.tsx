import React from 'react';
import {
  X,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  MapPin,
  TrendingUp,
  Award,
  Package,
  AlertTriangle,
  Lock,
  Star,
} from 'lucide-react';
import { PublicTrustProfile } from '../../types/index.ts';

interface TrustProfileModalProps {
  profile: PublicTrustProfile | null;
  isOpen: boolean;
  onClose: () => void;
}

export const TrustProfileModal: React.FC<TrustProfileModalProps> = ({
  profile,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !profile) return null;

  const memberSinceYear = new Date(profile.memberSince).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-4">
            <img
              src={profile.avatarUrl}
              alt={profile.displayName}
              className="w-16 h-16 rounded-full border-2 border-white/80 object-cover shadow-md"
            />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold">{profile.displayName}</h3>
                {profile.isIdVerified && (
                  <span title="Government ID Verified">
                    <ShieldCheck className="w-5 h-5 text-emerald-300" />
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-emerald-100 text-sm mt-1">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {profile.neighborhood}, {profile.district}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  Member since {memberSinceYear}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Key Trust Metrics */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-2xl font-bold text-slate-800">
                {profile.tasksCompletedCount}
              </span>
              <p className="text-xs text-slate-500 mt-0.5">Tasks Completed</p>
            </div>
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100">
              <span className="text-2xl font-bold text-emerald-700">
                {profile.completionRate}%
              </span>
              <p className="text-xs text-emerald-600 font-medium mt-0.5">Completion Rate</p>
            </div>
            <div className="p-3 rounded-xl bg-teal-50 border border-teal-100">
              <span className="text-2xl font-bold text-teal-700">
                {profile.reputationScore}%
              </span>
              <p className="text-xs text-teal-600 font-medium mt-0.5">Positive Reviews</p>
            </div>
          </div>

          {/* Verification Badges */}
          <div>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Verified Signals
            </h4>
            <div className="flex flex-wrap gap-2">
              {profile.badges.map((badge, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  {badge}
                </span>
              ))}
            </div>
          </div>

          {/* Category Experience Breakdown */}
          {profile.categoryBreakdown.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Demonstrated Neighborhood Experience
              </h4>
              <div className="space-y-2">
                {profile.categoryBreakdown.map(item => (
                  <div
                    key={item.categoryId}
                    className="flex items-center justify-between text-sm py-1.5 px-3 rounded-lg bg-slate-50"
                  >
                    <span className="flex items-center gap-2 text-slate-700 font-medium">
                      <Package className="w-4 h-4 text-slate-400" />
                      {item.categoryName}
                    </span>
                    <span className="text-xs font-semibold text-slate-600 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                      {item.completed} completed
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Verified Neighbor Reviews */}
          {profile.reviews && profile.reviews.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Verified Double-Blind Reviews ({profile.reviews.length})
                </h4>
                <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-medium border border-emerald-200">
                  Retaliation-Shielded
                </span>
              </div>
              <div className="space-y-2.5">
                {profile.reviews.map(r => (
                  <div
                    key={r.id}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <img
                          src={r.reviewerAvatar}
                          alt={r.reviewerName}
                          className="w-5 h-5 rounded-full object-cover"
                        />
                        <span className="text-xs font-bold text-slate-800">{r.reviewerName}</span>
                      </div>
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map(star => (
                          <Star
                            key={star}
                            className={`w-3 h-3 ${
                              star <= r.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 italic">"{r.comment}"</p>
                    <div className="flex items-center justify-between pt-0.5 text-[10px] text-slate-400">
                      <span>{new Date(r.createdAt).toLocaleDateString()}</span>
                      {r.isSybilCapped && (
                        <span className="text-amber-600 bg-amber-50 px-1 rounded font-mono">
                          Repeat Cap
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Privacy & Anti-Abuse Disclosure Notice */}
          <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/80 flex items-start gap-3">
            <Lock className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />
            <div className="text-xs text-amber-800 leading-relaxed">
              <strong>Privacy Protection:</strong> Exact GPS coordinates and personal contact details are never revealed in public profiles or open discovery. They are only disclosed after mutual task acceptance.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
