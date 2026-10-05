import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { Navbar } from './components/layout/Navbar.tsx';
import { AuthModal } from './components/auth/AuthModal.tsx';
import { TrustProfileModal } from './components/trust/TrustProfileModal.tsx';
import { AuditLogDrawer } from './components/audit/AuditLogDrawer.tsx';
import { TrustBadge } from './components/trust/TrustBadge.tsx';
import { CreateTaskWizard } from './components/tasks/CreateTaskWizard.tsx';
import { TaskFeed } from './components/tasks/TaskFeed.tsx';
import { TaskDetailModal } from './components/tasks/TaskDetailModal.tsx';
import { MyTasksDrawer } from './components/tasks/MyTasksDrawer.tsx';
import { TaskChatModal } from './components/chat/TaskChatModal.tsx';
import { ReportModal } from './components/moderation/ReportModal.tsx';
import { ReviewModal } from './components/reviews/ReviewModal.tsx';
import { TaskDiscoveryCard, Task, PublicTrustProfile } from './types/index.ts';
import { api } from './api/client.ts';
import {
  ShieldCheck,
  MapPin,
  CheckCircle2,
  Users,
  Lock,
  EyeOff,
  ArrowRight,
  TrendingUp,
  PlusCircle,
  Compass,
  Heart,
  Sparkles,
  ShieldAlert,
  KeyRound,
  CheckCheck,
} from 'lucide-react';

function DashboardContent() {
  const { user, trustProfile } = useAuth();

  // Modals & Drawers state
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isTrustOpen, setIsTrustOpen] = useState(false);
  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const [isCreateWizardOpen, setIsCreateWizardOpen] = useState(false);
  const [isMyTasksOpen, setIsMyTasksOpen] = useState(false);

  // Selected Task Detail
  const [selectedTask, setSelectedTask] = useState<TaskDiscoveryCard | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Foreign Requester Trust Inspection
  const [inspectedTrustProfile, setInspectedTrustProfile] = useState<PublicTrustProfile | null>(null);

  // Active Tab: 'DISCOVER' (I Can Help) or 'REQUEST'
  const [activeTab, setActiveTab] = useState<'DISCOVER' | 'OVERVIEW'>('DISCOVER');

  // Ephemeral Chat & Moderation state (Phase 5)
  const [chatTaskId, setChatTaskId] = useState<string | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [reportTargetUserId, setReportTargetUserId] = useState<string | undefined>(undefined);
  const [reportTargetTaskId, setReportTargetTaskId] = useState<string | undefined>(undefined);
  const [isReportOpen, setIsReportOpen] = useState(false);

  // Double-Blind Review state (Phase 6)
  const [reviewTaskId, setReviewTaskId] = useState<string | null>(null);
  const [reviewTaskTitle, setReviewTaskTitle] = useState<string | undefined>(undefined);
  const [reviewCounterpartName, setReviewCounterpartName] = useState<string | undefined>(undefined);
  const [isReviewOpen, setIsReviewOpen] = useState<boolean>(false);

  // Trigger re-render of feed on new task creation
  const [feedRefreshKey, setFeedRefreshKey] = useState<number>(0);

  // Notification Banner
  const [notification, setNotification] = useState<string | null>(null);

  const handleOpenReview = (taskId: string, taskTitle: string, counterpartName?: string) => {
    setReviewTaskId(taskId);
    setReviewTaskTitle(taskTitle);
    setReviewCounterpartName(counterpartName);
    setIsReviewOpen(true);
  };

  const handleOpenChat = (taskId: string) => {
    setChatTaskId(taskId);
    setIsChatOpen(true);
  };

  const handleOpenReport = (userId?: string, taskId?: string) => {
    setReportTargetUserId(userId);
    setReportTargetTaskId(taskId);
    setIsReportOpen(true);
  };

  const handleBlockUser = async (userId: string, userName: string) => {
    try {
      await api.blockUser(userId, 'Blocked by neighbor from chat/profile');
      setNotification(`Neighbor "${userName}" blocked. Communication closed.`);
      setIsChatOpen(false);
      setTimeout(() => setNotification(null), 5000);
    } catch (err: any) {
      setNotification(err.message || 'Failed to block user.');
    }
  };

  const handleOpenRequesterTrust = async (userId: string) => {
    try {
      const res = await api.getTrustProfile(userId);
      setInspectedTrustProfile(res.trustProfile);
      setIsTrustOpen(true);
    } catch {
      // fallback
    }
  };

  const handleTaskCreated = (newTask: Task) => {
    setNotification(`Neighborhood request "${newTask.title.substring(0, 35)}..." posted with verified safety screening!`);
    setFeedRefreshKey(prev => prev + 1);
    setActiveTab('DISCOVER');
    setTimeout(() => setNotification(null), 6000);
  };

  const handleOfferHelp = (taskId: string) => {
    setNotification('Offer recorded in local sandbox! Ready for Phase 4 (Matching & Handover OTP).');
    setTimeout(() => setNotification(null), 5000);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <Navbar
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenTrustProfile={() => {
          setInspectedTrustProfile(trustProfile);
          setIsTrustOpen(true);
        }}
        onOpenAuditLogs={() => setIsAuditOpen(true)}
        onOpenMyTasks={() => setIsMyTasksOpen(true)}
      />

      {/* Global Notification Banner */}
      {notification && (
        <div className="bg-emerald-600 text-white text-xs font-semibold px-4 py-2.5 text-center flex items-center justify-center gap-2 shadow-xs transition-all">
          <CheckCircle2 className="w-4 h-4 text-emerald-200" />
          <span>{notification}</span>
        </div>
      )}

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">
        {/* Core Product Hook: [ I NEED SOMETHING ] vs [ I CAN HELP ] */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-semibold mb-3">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Phase 4 Live: Matching, Verification OTPs & State Machine</span>
            </div>
            
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
              Trusted Neighborhood Assistance Marketplace
            </h1>
            
            <p className="mt-2 text-slate-300 text-xs sm:text-sm leading-relaxed max-w-2xl">
              Post a small local need, accept verified helper offers, and safely confirm physical parcel deliveries via mutual cryptographic handover codes.
            </p>

            {/* Core Action UX Buttons */}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                onClick={() => setIsCreateWizardOpen(true)}
                className="px-5 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-extrabold text-xs sm:text-sm shadow-lg shadow-emerald-500/25 transition-all flex items-center gap-2 transform active:scale-95"
              >
                <PlusCircle className="w-5 h-5 text-slate-950" />
                <span>[ I NEED SOMETHING ]</span>
              </button>

              <button
                onClick={() => setActiveTab('DISCOVER')}
                className={`px-5 py-3 rounded-2xl text-xs sm:text-sm font-extrabold border transition-all flex items-center gap-2 ${
                  activeTab === 'DISCOVER'
                    ? 'bg-white/20 border-white/40 text-white'
                    : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                }`}
              >
                <Compass className="w-5 h-5 text-emerald-400" />
                <span>[ I CAN HELP ]</span>
              </button>

              <button
                onClick={() => setIsMyTasksOpen(true)}
                className="px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm font-bold border border-white/20 transition-all flex items-center gap-2"
              >
                <KeyRound className="w-4 h-4 text-emerald-300" />
                <span>My Tasks & Handover Codes</span>
              </button>

              <button
                onClick={() => setActiveTab('OVERVIEW')}
                className={`px-4 py-3 rounded-2xl text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                  activeTab === 'OVERVIEW'
                    ? 'bg-white/20 border-white/40 text-white'
                    : 'bg-white/5 border-white/10 text-slate-400 hover:text-slate-200'
                }`}
              >
                <ShieldAlert className="w-4 h-4" />
                <span>Security Model</span>
              </button>
            </div>
          </div>
        </div>

        {/* TAB 1: DISCOVER FEED [ I CAN HELP ] */}
        {activeTab === 'DISCOVER' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Compass className="w-5 h-5 text-emerald-600" />
                  <span>Nearby Neighborhood Requests</span>
                </h2>
                <p className="text-xs text-slate-500">
                  Discover small assistance requests around your neighborhood. Safe, verified, and community inspected.
                </p>
              </div>

              <button
                onClick={() => setIsCreateWizardOpen(true)}
                className="self-start sm:self-auto px-4 py-2 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold hover:bg-emerald-100 transition-colors flex items-center gap-1.5"
              >
                <PlusCircle className="w-4 h-4 text-emerald-600" />
                <span>Post a Request</span>
              </button>
            </div>

            <TaskFeed
              onSelectTask={task => {
                setSelectedTask(task);
                setIsDetailOpen(true);
              }}
              onOpenRequesterTrust={handleOpenRequesterTrust}
              refreshKey={feedRefreshKey}
            />
          </div>
        )}

        {/* TAB 2: ARCHITECTURE & IDENTITY OVERVIEW */}
        {activeTab === 'OVERVIEW' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Active User Card */}
            {user && trustProfile && (
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-4">
                    <img
                      src={user.avatarUrl}
                      alt={user.displayName}
                      className="w-14 h-14 rounded-2xl object-cover ring-2 ring-emerald-500/30 shadow-md"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold text-slate-900">{user.displayName}</h2>
                        <TrustBadge
                          role={user.role}
                          isIdVerified={!!user.idVerifiedAt}
                          reputationScore={trustProfile.reputationScore}
                          size="md"
                        />
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                        <span className="flex items-center gap-1 font-medium">
                          <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                          {user.neighborhood}, {user.district}
                        </span>
                        <span>•</span>
                        <span className="font-mono text-slate-500">{user.phoneMasked}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setInspectedTrustProfile(trustProfile);
                        setIsTrustOpen(true);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
                    >
                      Trust Details
                    </button>
                    <button
                      onClick={() => setIsAuthOpen(true)}
                      className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold transition-colors"
                    >
                      Switch Persona
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 pt-4 text-center">
                  <div className="p-3 rounded-xl bg-slate-50">
                    <span className="text-xl font-bold text-slate-800">
                      {trustProfile.tasksCompletedCount}
                    </span>
                    <p className="text-[11px] text-slate-500">Tasks Completed</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50">
                    <span className="text-xl font-bold text-emerald-700">
                      {trustProfile.completionRate}%
                    </span>
                    <p className="text-[11px] text-slate-500">Completion Rate</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50">
                    <span className="text-xl font-bold text-teal-700">
                      {trustProfile.reputationScore}%
                    </span>
                    <p className="text-[11px] text-slate-500">Positive Feedback</p>
                  </div>
                </div>
              </div>
            )}

            {/* Security Pillars Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Lock className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-800 text-sm">Deterministic & AI Moderation</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Submissions are screened against prohibited keywords (keys, weapons, sealed boxes, bedroom entry) and analyzed by Gemini 3.8 Flash before persisting to storage.
                </p>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center">
                  <EyeOff className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-800 text-sm">Coarse Discovery Obfuscation</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Discovery feeds strictly show neighborhood centroids with ~500m random spatial jitter. Exact pickup notes remain AES-256 encrypted until mutual acceptance.
                </p>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-800 text-sm">Open Inspection Protocol</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Eliminates drug mule and contraband exploits by requiring mutual physical package inspection before parcel handovers can proceed.
                </p>
              </div>
            </div>

            {/* Implementation Progress Roadmap */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
              <h3 className="font-bold text-slate-800 text-sm mb-3">Roadmap Tracker</h3>
              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200">
                  <span>✓ Phase 1: Architecture, Threat Model & PostGIS Schemas</span>
                  <span>Completed</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200">
                  <span>✓ Phase 2: Auth, Rate Limiter, Trust Profiles & Audit Ledger</span>
                  <span>Completed</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200">
                  <span>✓ Phase 3: Core Task Engine, AI Screening & Proximity Feed</span>
                  <span>Current Phase</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 text-slate-600 border border-slate-200">
                  <span>Phase 4: Matching, Verification OTPs & State Machine Transitions</span>
                  <span className="text-slate-400">Next Step</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODALS & DRAWERS */}
      <CreateTaskWizard
        isOpen={isCreateWizardOpen}
        onClose={() => setIsCreateWizardOpen(false)}
        onTaskCreated={handleTaskCreated}
      />

      <TaskDetailModal
        task={selectedTask}
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedTask(null);
        }}
        onOpenRequesterTrust={handleOpenRequesterTrust}
        onOfferHelp={handleOfferHelp}
      />

      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />

      <TrustProfileModal
        profile={inspectedTrustProfile}
        isOpen={isTrustOpen}
        onClose={() => {
          setIsTrustOpen(false);
          setInspectedTrustProfile(null);
        }}
      />

      <AuditLogDrawer isOpen={isAuditOpen} onClose={() => setIsAuditOpen(false)} />

      <MyTasksDrawer
        isOpen={isMyTasksOpen}
        onClose={() => setIsMyTasksOpen(false)}
        onOpenRequesterTrust={handleOpenRequesterTrust}
        onOpenChat={handleOpenChat}
        onOpenReview={handleOpenReview}
        onTasksUpdated={() => setFeedRefreshKey(prev => prev + 1)}
      />

      {/* Task-Linked Ephemeral Chat Modal */}
      <TaskChatModal
        taskId={chatTaskId}
        isOpen={isChatOpen}
        onClose={() => {
          setIsChatOpen(false);
          setChatTaskId(null);
        }}
        onOpenReport={handleOpenReport}
        onBlockUser={handleBlockUser}
      />

      {/* Double-Blind Review Modal (Phase 6) */}
      <ReviewModal
        taskId={reviewTaskId}
        taskTitle={reviewTaskTitle}
        counterpartName={reviewCounterpartName}
        isOpen={isReviewOpen}
        onClose={() => {
          setIsReviewOpen(false);
          setReviewTaskId(null);
        }}
        onReviewSubmitted={() => {
          setNotification('Double-blind review sealed! Reviews are revealed once both parties submit.');
          setTimeout(() => setNotification(null), 5000);
          setFeedRefreshKey(prev => prev + 1);
        }}
      />

      {/* Safety & Abuse Report Modal */}
      <ReportModal
        reportedUserId={reportTargetUserId}
        reportedTaskId={reportTargetTaskId}
        isOpen={isReportOpen}
        onClose={() => {
          setIsReportOpen(false);
          setReportTargetUserId(undefined);
          setReportTargetTaskId(undefined);
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <DashboardContent />
    </AuthProvider>
  );
}
