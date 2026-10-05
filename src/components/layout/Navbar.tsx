import React from 'react';
import {
  Shield,
  MapPin,
  Terminal,
  User as UserIcon,
  LogOut,
  Users,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { TrustBadge } from '../trust/TrustBadge.tsx';

interface NavbarProps {
  onOpenAuth: () => void;
  onOpenTrustProfile: () => void;
  onOpenAuditLogs: () => void;
  onOpenMyTasks: () => void;
  activeTasksCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenAuth,
  onOpenTrustProfile,
  onOpenAuditLogs,
  onOpenMyTasks,
  activeTasksCount = 0,
}) => {
  const { user, trustProfile, isAuthenticated, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-tight text-slate-900">
                Mahallem
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                MVP Phase 4
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium hidden sm:block">
              Trusted Neighborhood Marketplace
            </p>
          </div>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* My Tasks & Handover Codes Trigger */}
          {isAuthenticated && (
            <button
              onClick={onOpenMyTasks}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-200 bg-emerald-50/80 text-emerald-800 hover:bg-emerald-100 text-xs font-bold transition-colors shadow-2xs"
              title="View my active tasks and handover codes"
            >
              <span>My Tasks</span>
              {activeTasksCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center">
                  {activeTasksCount}
                </span>
              )}
            </button>
          )}

          {/* Security Audit Log trigger */}
          <button
            onClick={onOpenAuditLogs}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition-colors"
            title="Inspect security audit ledger"
          >
            <Terminal className="w-3.5 h-3.5 text-slate-600" />
            <span className="hidden md:inline">Ledger</span>
          </button>

          {/* User profile / Authentication button */}
          {isAuthenticated && user && trustProfile ? (
            <div className="flex items-center gap-2">
              {/* Trust badge & profile trigger */}
              <button
                onClick={onOpenTrustProfile}
                className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all text-left"
              >
                <img
                  src={user.avatarUrl}
                  alt={user.displayName}
                  className="w-7 h-7 rounded-full object-cover ring-1 ring-emerald-500"
                />
                <div className="hidden sm:block">
                  <div className="text-xs font-bold text-slate-800 flex items-center gap-1">
                    {user.displayName}
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-slate-400" />
                    {user.neighborhood}
                  </div>
                </div>
                <TrustBadge
                  role={user.role}
                  isIdVerified={!!user.idVerifiedAt}
                  reputationScore={trustProfile.reputationScore}
                  size="sm"
                  showScore={false}
                />
              </button>

              {/* Persona switch button */}
              <button
                onClick={onOpenAuth}
                className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                title="Switch neighbor persona"
              >
                <Users className="w-4 h-4" />
              </button>

              {/* Logout */}
              <button
                onClick={() => logout()}
                className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
            >
              <UserIcon className="w-4 h-4" />
              <span>Neighbor Sign In</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
