import React from 'react';
import {
  MapPin,
  Clock,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Eye,
  Package,
  ShoppingBag,
  Store,
  HeartHandshake,
  RotateCcw,
  Compass,
  Users,
} from 'lucide-react';
import { TaskDiscoveryCard } from '../../types/index.ts';
import { TrustBadge } from '../trust/TrustBadge.tsx';

interface TaskCardProps {
  task: TaskDiscoveryCard;
  onSelect: (task: TaskDiscoveryCard) => void;
  onOpenRequesterTrust: (userId: string) => void;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  'package-transport': <Package className="w-4 h-4" />,
  'grocery-pickup': <ShoppingBag className="w-4 h-4" />,
  'product-pickup': <Store className="w-4 h-4" />,
  'pet-care': <HeartHandshake className="w-4 h-4" />,
  'item-return': <RotateCcw className="w-4 h-4" />,
  'traveler-carry': <Compass className="w-4 h-4" />,
  'local-favor': <Users className="w-4 h-4" />,
};

export const TaskCard: React.FC<TaskCardProps> = ({ task, onSelect, onOpenRequesterTrust }) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 hover:border-emerald-500/50 hover:shadow-lg transition-all duration-200 p-5 flex flex-col justify-between group">
      <div>
        {/* Top bar: Category + Approximate Distance */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-100">
            {CATEGORY_ICONS[task.categoryId] || <Package className="w-3.5 h-3.5" />}
            <span className="capitalize">{task.categoryId.replace('-', ' ')}</span>
          </span>

          <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 bg-slate-100/80 px-2 py-0.5 rounded-md" title="Coarse distance (obfuscated for privacy)">
            <MapPin className="w-3.5 h-3.5 text-emerald-600" />
            {task.approxDistanceFormatted}
          </span>
        </div>

        {/* Title */}
        <h3
          onClick={() => onSelect(task)}
          className="text-base font-bold text-slate-900 group-hover:text-emerald-700 transition-colors cursor-pointer line-clamp-2 leading-snug"
        >
          {task.title}
        </h3>

        {/* Description snippet */}
        <p className="text-xs text-slate-600 mt-2 line-clamp-2 leading-relaxed">
          {task.description}
        </p>

        {/* Location Route / District badges */}
        <div className="mt-3.5 flex flex-wrap items-center gap-2 text-xs font-medium text-slate-600">
          <div className="flex items-center gap-1 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-100">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>{task.neighborhood}, {task.district}</span>
          </div>

          {task.destinationDistrict && (
            <>
              <ArrowRight className="w-3 h-3 text-slate-400" />
              <div className="flex items-center gap-1 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-100">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                <span>{task.destinationNeighborhood || task.destinationDistrict}</span>
              </div>
            </>
          )}
        </div>

        {/* Inspection protocol badge */}
        {task.openInspectionAgreed && (
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-teal-800 bg-teal-50/70 border border-teal-100 px-2 py-1 rounded-lg">
            <Eye className="w-3.5 h-3.5 text-teal-600 shrink-0" />
            <span>Open Inspection Verified</span>
          </div>
        )}
      </div>

      {/* Footer: Requester Trust Badge + Reward & Help CTA */}
      <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between">
        {/* Requester clickable preview */}
        <div
          onClick={() => onOpenRequesterTrust(task.requester.id)}
          className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
        >
          <img
            src={task.requester.avatarUrl}
            alt={task.requester.displayName}
            className="w-7 h-7 rounded-full object-cover ring-1 ring-slate-200"
          />
          <div>
            <div className="text-xs font-semibold text-slate-800 flex items-center gap-1">
              <span>{task.requester.displayName}</span>
              {task.requester.isIdVerified && (
                <span title="ID Verified">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                </span>
              )}
            </div>
            <span className="text-[10px] text-slate-500">
              {task.requester.tasksCompletedCount} tasks • {task.requester.reputationScore}%
            </span>
          </div>
        </div>

        {/* Reward & Details Button */}
        <div className="flex items-center gap-2">
          {task.rewardCents > 0 && (
            <span className="text-xs font-bold text-slate-900 bg-amber-50 border border-amber-200 text-amber-800 px-2 py-1 rounded-lg">
              ₺{(task.rewardCents / 100).toFixed(0)}
            </span>
          )}
          <button
            onClick={() => onSelect(task)}
            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-emerald-600 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            Details
          </button>
        </div>
      </div>
    </div>
  );
};
