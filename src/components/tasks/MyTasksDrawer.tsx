import React, { useState, useEffect } from 'react';
import {
  X,
  Package,
  Heart,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Lock,
  MapPin,
  RefreshCw,
  KeyRound,
  ArrowRight,
  Eye,
  AlertCircle,
  Truck,
  Users,
  MessageSquare,
  Star,
} from 'lucide-react';
import { Task, TaskOffer } from '../../types/index.ts';
import { api } from '../../api/client.ts';
import { HandoverOtpModal } from './HandoverOtpModal.tsx';
import { useAuth } from '../../context/AuthContext.tsx';

interface MyTasksDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenRequesterTrust: (userId: string) => void;
  onOpenChat: (taskId: string) => void;
  onOpenReview: (taskId: string, taskTitle: string, counterpartName?: string) => void;
  onTasksUpdated?: () => void;
}

export const MyTasksDrawer: React.FC<MyTasksDrawerProps> = ({
  isOpen,
  onClose,
  onOpenRequesterTrust,
  onOpenChat,
  onOpenReview,
  onTasksUpdated,
}) => {
  const { user } = useAuth();
  const [tab, setTab] = useState<'REQUESTED' | 'HELPING'>('REQUESTED');
  const [requestedTasks, setRequestedTasks] = useState<Array<Task & { completionOtp?: string }>>([]);
  const [helpingTasks, setHelpingTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Offers state for expanded requested task
  const [activeOffersTaskId, setActiveOffersTaskId] = useState<string | null>(null);
  const [taskOffers, setTaskOffers] = useState<TaskOffer[]>([]);
  const [isLoadingOffers, setIsLoadingOffers] = useState<boolean>(false);

  // OTP Modal state for helper
  const [otpModalTask, setOtpModalTask] = useState<Task | null>(null);

  // Action status message
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const fetchMyTasks = async () => {
    setIsLoading(true);
    try {
      const res = await api.getMyTasks();
      setRequestedTasks(res.requested);
      setHelpingTasks(res.helping);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchMyTasks();
      setActionMsg(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleViewOffers = async (taskId: string) => {
    if (activeOffersTaskId === taskId) {
      setActiveOffersTaskId(null);
      return;
    }

    setActiveOffersTaskId(taskId);
    setIsLoadingOffers(true);
    try {
      const res = await api.getTaskOffers(taskId);
      setTaskOffers(res.offers);
    } catch (err: any) {
      setActionMsg(err.message || 'Failed to fetch offers');
    } finally {
      setIsLoadingOffers(false);
    }
  };

  const handleAcceptOffer = async (taskId: string, offerId: string) => {
    try {
      const res = await api.acceptOffer(taskId, offerId);
      setActionMsg('Offer accepted! Task is now ACCEPTED and completion OTP generated.');
      fetchMyTasks();
      setActiveOffersTaskId(null);
      if (onTasksUpdated) onTasksUpdated();
    } catch (err: any) {
      setActionMsg(err.message || 'Failed to accept offer.');
    }
  };

  const handleStartTransit = async (taskId: string) => {
    try {
      await api.transitionTask(taskId, 'IN_PROGRESS', 'Helper has picked up item and is in transit');
      setActionMsg('Status updated to IN_PROGRESS. Proceed to drop-off point.');
      fetchMyTasks();
      if (onTasksUpdated) onTasksUpdated();
    } catch (err: any) {
      setActionMsg(err.message || 'Failed to start transit.');
    }
  };

  const handleHandoverSuccess = (updatedTask: Task) => {
    setActionMsg(`Delivery confirmed! Task "${updatedTask.title.substring(0, 30)}..." completed.`);
    fetchMyTasks();
    if (onTasksUpdated) onTasksUpdated();
  };

  const totalActive =
    requestedTasks.filter(t => t.status !== 'COMPLETED' && t.status !== 'CANCELLED').length +
    helpingTasks.filter(t => t.status !== 'COMPLETED' && t.status !== 'CANCELLED').length;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs">
      <div className="bg-white text-slate-900 w-full max-w-xl h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-slate-900 text-base">Active Neighborhood Tasks</h3>
              {totalActive > 0 && (
                <span className="text-xs font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                  {totalActive} active
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              Manage offers, progressive location details & completion codes
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={fetchMyTasks}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-slate-200 px-6 pt-2 bg-slate-50/50">
          <button
            onClick={() => { setTab('REQUESTED'); setActionMsg(null); }}
            className={`pb-2.5 text-xs font-bold px-4 border-b-2 transition-colors flex items-center gap-2 ${
              tab === 'REQUESTED'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Requested by Me ({requestedTasks.length})</span>
          </button>
          <button
            onClick={() => { setTab('HELPING'); setActionMsg(null); }}
            className={`pb-2.5 text-xs font-bold px-4 border-b-2 transition-colors flex items-center gap-2 ${
              tab === 'HELPING'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Heart className="w-4 h-4" />
            <span>I am Helping ({helpingTasks.length})</span>
          </button>
        </div>

        {/* Banner notification */}
        {actionMsg && (
          <div className="p-3 bg-emerald-50 border-b border-emerald-100 text-xs font-medium text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionMsg}</span>
          </div>
        )}

        {/* List Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {tab === 'REQUESTED' && (
            <>
              {requestedTasks.length === 0 ? (
                <div className="text-center py-16 text-slate-400 text-xs">
                  You haven&apos;t posted any neighborhood requests yet.
                </div>
              ) : (
                requestedTasks.map(task => {
                  const hasOffersOpen = task.status === 'OPEN';
                  const isAgreed = task.status === 'ACCEPTED' || task.status === 'IN_PROGRESS';
                  const isCompleted = task.status === 'COMPLETED';

                  return (
                    <div
                      key={task.id}
                      className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs space-y-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                          {task.categoryId.replace('-', ' ')}
                        </span>
                        <span
                          className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                            isCompleted
                              ? 'bg-emerald-100 text-emerald-800'
                              : isAgreed
                              ? 'bg-teal-100 text-teal-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {task.status}
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-slate-900 leading-snug">
                        {task.title}
                      </h4>

                      <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                        <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{task.neighborhood}, {task.district}</span>
                        {task.destinationDistrict && (
                          <>
                            <ArrowRight className="w-3 h-3 text-slate-400" />
                            <span>{task.destinationNeighborhood || task.destinationDistrict}</span>
                          </>
                        )}
                      </div>

                      {/* SECRET COMPLETION CODE (Shown strictly to Requester!) */}
                      {isAgreed && task.completionOtp && (
                        <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-900 to-teal-950 text-white space-y-1.5 shadow-md">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] uppercase tracking-wider text-emerald-300 font-bold flex items-center gap-1">
                              <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
                              Secret Physical Handover Code
                            </span>
                            <span className="text-lg font-mono font-extrabold tracking-widest text-emerald-200 bg-white/10 px-2.5 py-0.5 rounded-md">
                              {task.completionOtp}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-300 leading-relaxed">
                            Give this 6-digit code to your helper <strong>ONLY</strong> when they physically hand over your item at the destination.
                          </p>
                        </div>
                      )}

                      {/* Requester Chat Button when Agreed */}
                      {isAgreed && (
                        <button
                          onClick={() => onOpenChat(task.id)}
                          className="w-full py-2 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200 flex items-center justify-center gap-2 transition-colors"
                        >
                          <MessageSquare className="w-4 h-4 text-emerald-600" />
                          <span>Chat with Helper</span>
                        </button>
                      )}

                      {/* Requester Review Button when Completed */}
                      {(task.status === 'COMPLETED' || task.status === 'CONFIRMED') && (
                        <button
                          onClick={() => onOpenReview(task.id, task.title, 'Helper')}
                          className="w-full py-2 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold border border-amber-200 flex items-center justify-center gap-2 transition-colors shadow-2xs"
                        >
                          <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
                          <span>Double-Blind Review & Feedback</span>
                        </button>
                      )}

                      {/* OPEN State: View Incoming Offers Action */}
                      {hasOffersOpen && (
                        <div className="pt-2 border-t border-slate-100">
                          <button
                            onClick={() => handleViewOffers(task.id)}
                            className="w-full py-2 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 border border-slate-200 flex items-center justify-center gap-1.5 transition-colors"
                          >
                            <Users className="w-3.5 h-3.5 text-emerald-600" />
                            <span>
                              {activeOffersTaskId === task.id ? 'Hide Offers' : 'View Helper Offers'}
                            </span>
                          </button>

                          {activeOffersTaskId === task.id && (
                            <div className="mt-3 space-y-2 pt-2 border-t border-slate-100">
                              {isLoadingOffers ? (
                                <div className="text-center py-4 text-xs text-slate-400">Loading offers...</div>
                              ) : taskOffers.length === 0 ? (
                                <div className="text-center py-4 text-xs text-slate-400">
                                  No offers received yet. Nearby neighbors will see your request in their discovery feed.
                                </div>
                              ) : (
                                taskOffers.map(o => (
                                  <div
                                    key={o.id}
                                    className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2"
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <img
                                          src={o.helper.avatarUrl}
                                          alt={o.helper.displayName}
                                          className="w-7 h-7 rounded-full object-cover"
                                        />
                                        <div>
                                          <div className="text-xs font-bold text-slate-800 flex items-center gap-1">
                                            <span>{o.helper.displayName}</span>
                                            {o.helper.isIdVerified && (
                                              <ShieldCheck className="w-3 h-3 text-emerald-600" />
                                            )}
                                          </div>
                                          <span className="text-[10px] text-slate-500">
                                            {o.helper.neighborhood} • {o.helper.tasksCompletedCount} completed
                                          </span>
                                        </div>
                                      </div>

                                      <button
                                        onClick={() => handleAcceptOffer(task.id, o.id)}
                                        className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors"
                                      >
                                        Accept Offer
                                      </button>
                                    </div>
                                    <p className="text-xs text-slate-700 italic">
                                      &ldquo;{o.message}&rdquo;
                                    </p>
                                  </div>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </>
          )}

          {tab === 'HELPING' && (
            <>
              {helpingTasks.length === 0 ? (
                <div className="text-center py-16 text-slate-400 text-xs">
                  You haven&apos;t offered to help with any tasks yet. Explore the discovery feed to assist a neighbor!
                </div>
              ) : (
                helpingTasks.map(task => {
                  const isAccepted = task.status === 'ACCEPTED';
                  const isInProgress = task.status === 'IN_PROGRESS';
                  const isCompleted = task.status === 'COMPLETED';

                  return (
                    <div
                      key={task.id}
                      className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs space-y-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800">
                          Assisting Neighbor
                        </span>
                        <span
                          className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                            isCompleted
                              ? 'bg-emerald-100 text-emerald-800'
                              : isInProgress
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-teal-100 text-teal-800'
                          }`}
                        >
                          {task.status}
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-slate-900 leading-snug">
                        {task.title}
                      </h4>

                      {/* UNLOCKED CONFIDENTIAL PICKUP ADDRESS (Safely disclosed now that offer was accepted!) */}
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                        <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-emerald-700 tracking-wider">
                          <Lock className="w-3.5 h-3.5" />
                          <span>Unlocked Pickup Building Details</span>
                        </div>
                        <p className="text-xs font-semibold text-slate-800">
                          {task.pickupAddressEncrypted || 'Pickup details verified with requester'}
                        </p>
                      </div>

                      {/* Action buttons for Helper */}
                      <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                        {(isAccepted || isInProgress) && (
                          <button
                            onClick={() => onOpenChat(task.id)}
                            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors"
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Chat with Requester</span>
                          </button>
                        )}

                        {isAccepted && (
                          <button
                            onClick={() => handleStartTransit(task.id)}
                            className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors"
                          >
                            <Truck className="w-3.5 h-3.5" />
                            <span>Mark In-Transit</span>
                          </button>
                        )}

                        {isInProgress && (
                          <button
                            onClick={() => setOtpModalTask(task)}
                            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md flex items-center gap-1.5 transition-colors"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                            <span>Enter Handover Code to Complete</span>
                          </button>
                        )}

                        {isCompleted && (
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="flex items-center gap-1 text-xs font-bold text-emerald-700">
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Completed</span>
                            </div>
                            <button
                              onClick={() => onOpenReview(task.id, task.title, 'Requester')}
                              className="px-3.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold border border-amber-200 flex items-center gap-1.5 transition-colors shadow-2xs"
                            >
                              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                              <span>Double-Blind Review</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </>
          )}
        </div>
      </div>

      {/* Helper OTP Entry Modal */}
      <HandoverOtpModal
        task={otpModalTask}
        isOpen={!!otpModalTask}
        onClose={() => setOtpModalTask(null)}
        onCompleted={handleHandoverSuccess}
      />
    </div>
  );
};
