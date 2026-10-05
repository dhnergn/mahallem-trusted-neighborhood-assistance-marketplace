import React from 'react';
import { ShieldCheck, CheckCircle2, Award, ShieldAlert } from 'lucide-react';
import { UserRole } from '../../types/index.ts';

interface TrustBadgeProps {
  role?: UserRole;
  isIdVerified?: boolean;
  reputationScore?: number;
  completionRate?: number;
  size?: 'sm' | 'md' | 'lg';
  showScore?: boolean;
  onClick?: () => void;
}

export const TrustBadge: React.FC<TrustBadgeProps> = ({
  role = 'USER',
  isIdVerified = false,
  reputationScore = 100,
  completionRate = 100,
  size = 'md',
  showScore = true,
  onClick,
}) => {
  const isVerifiedNeighbor = role === 'VERIFIED_NEIGHBOR' || isIdVerified;
  const isModerator = role === 'MODERATOR' || role === 'ADMIN';

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3.5 py-1.5 gap-2',
  }[size];

  if (isModerator) {
    return (
      <span
        onClick={onClick}
        className={`inline-flex items-center rounded-full font-medium bg-amber-50 text-amber-800 border border-amber-200 shadow-xs cursor-pointer hover:bg-amber-100 transition-colors ${sizeClasses}`}
      >
        <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
        <span>Neighborhood Moderator</span>
      </span>
    );
  }

  if (isVerifiedNeighbor) {
    return (
      <span
        onClick={onClick}
        className={`inline-flex items-center rounded-full font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-xs cursor-pointer hover:bg-emerald-100 transition-colors ${sizeClasses}`}
        title="Identity verified by government ID. High trust score."
      >
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
        <span>Verified Neighbor</span>
        {showScore && (
          <span className="ml-1 pl-1 border-l border-emerald-300 text-emerald-700 font-semibold">
            {reputationScore}%
          </span>
        )}
      </span>
    );
  }

  return (
    <span
      onClick={onClick}
      className={`inline-flex items-center rounded-full font-medium bg-slate-50 text-slate-700 border border-slate-200 shadow-xs cursor-pointer hover:bg-slate-100 transition-colors ${sizeClasses}`}
    >
      <CheckCircle2 className="w-3.5 h-3.5 text-slate-500" />
      <span>Neighbor</span>
      {showScore && completionRate > 0 && (
        <span className="ml-1 pl-1 border-l border-slate-300 text-slate-600 font-medium">
          {completionRate}% rate
        </span>
      )}
    </span>
  );
};
