import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Send,
  Shield,
  ShieldAlert,
  AlertTriangle,
  Lock,
  RefreshCw,
  Clock,
  Flag,
  UserX,
  CheckCircle2,
} from 'lucide-react';
import { TaskConversation, ChatMessage } from '../../types/index.ts';
import { api } from '../../api/client.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { TrustBadge } from '../trust/TrustBadge.tsx';

interface TaskChatModalProps {
  taskId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenReport: (userId: string, taskId?: string) => void;
  onBlockUser: (userId: string, userName: string) => void;
}

export const TaskChatModal: React.FC<TaskChatModalProps> = ({
  taskId,
  isOpen,
  onClose,
  onOpenReport,
  onBlockUser,
}) => {
  const { user } = useAuth();
  const [conversation, setConversation] = useState<TaskConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [shieldNotice, setShieldNotice] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchChat = async () => {
    if (!taskId) return;
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await api.getConversation(taskId);
      setConversation(res.conversation);
      setMessages(res.conversation.messages);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load task conversation.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && taskId) {
      fetchChat();
      setShieldNotice(null);
    }
  }, [isOpen, taskId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!isOpen || !taskId) return null;

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    setIsSending(true);
    setErrorMsg(null);
    setShieldNotice(null);

    try {
      const res = await api.sendMessage(taskId, inputText.trim());
      if (res.success && res.message) {
        setMessages(prev => [...prev, res.message]);
        setInputText('');

        if (res.message.hasShieldedContent) {
          setShieldNotice('Safety Alert: External phone numbers or links were automatically shielded to protect you from off-platform scams.');
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to deliver message.');
    } finally {
      setIsSending(false);
    }
  };

  const otherUser = conversation?.otherParticipant;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full h-[600px] max-h-[90vh] overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            {otherUser && (
              <>
                <img
                  src={otherUser.avatarUrl}
                  alt={otherUser.displayName}
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-emerald-500/30"
                />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-slate-900">
                      {otherUser.displayName}
                    </span>
                    <TrustBadge
                      role={otherUser.role}
                      isIdVerified={otherUser.isIdVerified}
                      reputationScore={otherUser.reputationScore}
                      size="sm"
                      showScore={false}
                    />
                  </div>
                  <span className="text-[11px] text-slate-500 block truncate max-w-[220px]">
                    {conversation?.taskTitle}
                  </span>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-1">
            {otherUser && (
              <>
                <button
                  onClick={() => onOpenReport(otherUser.id, taskId)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  title="Report safety concern"
                >
                  <Flag className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onBlockUser(otherUser.id, otherUser.displayName)}
                  className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-200/60 rounded-lg transition-colors"
                  title="Block this neighbor"
                >
                  <UserX className="w-4 h-4" />
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Anti-Leak Safety Banner */}
        <div className="px-4 py-2 bg-emerald-50/80 border-b border-emerald-100 flex items-center justify-between text-[11px] text-emerald-800">
          <div className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-emerald-600" />
            <span>Protected Ephemeral Chat (Anti-Phishing Shield Active)</span>
          </div>
          <span className="font-semibold text-emerald-900 bg-emerald-100/70 px-1.5 py-0.5 rounded">
            Task {conversation?.taskStatus}
          </span>
        </div>

        {/* Shield notification if triggered */}
        {shieldNotice && (
          <div className="p-3 bg-amber-50 border-b border-amber-200 text-amber-800 text-xs flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>{shieldNotice}</span>
          </div>
        )}

        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
          {isLoading ? (
            <div className="text-center py-16 text-xs text-slate-400">Loading secure chat...</div>
          ) : errorMsg ? (
            <div className="text-center py-12 px-4 text-xs text-rose-600 bg-rose-50 rounded-xl m-4 border border-rose-200">
              {errorMsg}
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-16 text-xs text-slate-400 space-y-1">
              <Lock className="w-6 h-6 text-slate-300 mx-auto" />
              <p className="font-semibold text-slate-600">Conversation Initialized</p>
              <p>Coordinate safe public meeting details or verify item checkpoints.</p>
            </div>
          ) : (
            messages.map(msg => {
              const isMine = msg.senderId === user?.id;

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed shadow-2xs ${
                      isMine
                        ? 'bg-emerald-600 text-white rounded-br-xs'
                        : 'bg-white text-slate-800 border border-slate-200/80 rounded-bl-xs'
                    }`}
                  >
                    {msg.content}

                    {msg.hasShieldedContent && (
                      <span className="block mt-1 pt-1 border-t border-white/20 text-[10px] text-amber-200 italic">
                        🛡️ Off-platform phone/link shielded for privacy
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5 px-1 font-mono">
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        {conversation?.isActive ? (
          <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-200 bg-white flex items-center gap-2">
            <input
              type="text"
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              placeholder="Type message (phone numbers & external links shielded)..."
              maxLength={500}
              className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button
              type="submit"
              disabled={isSending || !inputText.trim()}
              className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-colors disabled:opacity-50 shadow-xs"
            >
              {isSending ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </form>
        ) : (
          <div className="p-3 bg-slate-100 border-t border-slate-200 text-center text-xs text-slate-500 font-medium">
            This conversation is closed because the task is {conversation?.taskStatus || 'inactive'}.
          </div>
        )}
      </div>
    </div>
  );
};
