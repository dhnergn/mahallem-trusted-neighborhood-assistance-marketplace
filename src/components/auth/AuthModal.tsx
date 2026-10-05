import React, { useState, useEffect } from 'react';
import {
  X,
  Phone,
  Mail,
  Shield,
  ArrowRight,
  RefreshCw,
  Users,
  CheckCircle,
  AlertCircle,
  KeyRound,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { api } from '../../api/client.ts';
import { User } from '../../types/index.ts';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { requestOtp, verifyOtp, switchAccount, user } = useAuth();

  const [step, setStep] = useState<'input' | 'verify' | 'switch'>('input');
  const [identifier, setIdentifier] = useState('+90 532 999 8877');
  const [authType, setAuthType] = useState<'phone' | 'email'>('phone');
  const [otpCode, setOtpCode] = useState('');
  const [debugOtp, setDebugOtp] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [neighborsList, setNeighborsList] = useState<Array<Pick<User, 'id' | 'displayName' | 'avatarUrl' | 'role' | 'neighborhood' | 'district'> & { isIdVerified: boolean }>>([]);

  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
      setInfoMsg(null);
      api.getNeighbors().then(res => setNeighborsList(res.neighbors)).catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);
    setIsSubmitting(true);

    try {
      const res = await requestOtp(identifier, authType);
      if (res.success) {
        setInfoMsg(res.message);
        if (res.debugCode) {
          setDebugOtp(res.debugCode);
          setOtpCode(res.debugCode); // pre-populate in dev for frictionless testing
        }
        setStep('verify');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to request verification code');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      await verifyOtp(identifier, otpCode);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid verification code');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSwitchAccount = async (targetUserId: string) => {
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await switchAccount(targetUserId);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to switch identity');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-lg">Neighbor Sign-In</h3>
              <p className="text-xs text-slate-500">Secure, privacy-first authentication</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab navigation */}
        <div className="flex border-b border-slate-100 px-6 pt-2 bg-slate-50/50">
          <button
            onClick={() => { setStep('input'); setErrorMsg(null); }}
            className={`pb-2.5 text-xs font-semibold px-3 border-b-2 transition-colors ${
              step !== 'switch'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Phone / OTP Sign-In
          </button>
          <button
            onClick={() => { setStep('switch'); setErrorMsg(null); }}
            className={`pb-2.5 text-xs font-semibold px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              step === 'switch'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Switch Demo Persona
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-rose-700 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {infoMsg && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-2.5 text-emerald-700 text-xs">
              <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{infoMsg}</span>
            </div>
          )}

          {step === 'input' && (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Verification Method
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => { setAuthType('phone'); setIdentifier('+90 532 999 8877'); }}
                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-medium border ${
                      authType === 'phone'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-800 font-semibold'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Phone className="w-3.5 h-3.5" />
                    Mobile Phone
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAuthType('email'); setIdentifier('resident@mahallem.local'); }}
                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-medium border ${
                      authType === 'email'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-800 font-semibold'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Mail className="w-3.5 h-3.5" />
                    Email
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  {authType === 'phone' ? 'Phone Number' : 'Email Address'}
                </label>
                <input
                  type={authType === 'phone' ? 'tel' : 'email'}
                  value={identifier}
                  onChange={e => setIdentifier(e.target.value)}
                  placeholder={authType === 'phone' ? '+90 532 000 0000' : 'neighbor@example.com'}
                  required
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Protected by HMAC hashing. Raw number is never exposed in discovery.
                </p>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-xs transition-colors disabled:opacity-50"
              >
                {isSubmitting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>Send Verification Code</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {step === 'verify' && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="text-center p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-xs text-slate-500">Code dispatched to</span>
                <p className="font-semibold text-slate-800 text-sm">{identifier}</p>
                {debugOtp && (
                  <div className="mt-2 text-xs bg-emerald-100 text-emerald-800 font-mono py-1 px-2 rounded-lg inline-block">
                    Development Sandbox OTP: <strong>{debugOtp}</strong>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Enter 6-Digit Code
                </label>
                <div className="relative">
                  <input
                    type="text"
                    maxLength={6}
                    value={otpCode}
                    onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    autoFocus
                    required
                    className="w-full text-center tracking-widest font-mono text-xl py-2.5 px-4 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                </div>
                <p className="text-[11px] text-slate-400 mt-1 text-center">
                  Expires in 5 minutes. 3 attempts allowed.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep('input')}
                  className="w-1/3 py-2.5 px-3 rounded-xl border border-slate-200 text-slate-600 text-xs font-medium hover:bg-slate-50"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || otpCode.length !== 6}
                  className="w-2/3 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-xs transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <span>Confirm & Sign In</span>
                  )}
                </button>
              </div>
            </form>
          )}

          {step === 'switch' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-500 mb-2">
                Switch instantly between pre-configured neighbors to test different trust tiers, roles, and localized perspectives:
              </p>
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {neighborsList.map(n => {
                  const isCurrent = user?.id === n.id;
                  return (
                    <div
                      key={n.id}
                      onClick={() => !isCurrent && handleSwitchAccount(n.id)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                        isCurrent
                          ? 'border-emerald-500 bg-emerald-50/60 ring-1 ring-emerald-400'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={n.avatarUrl}
                          alt={n.displayName}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-bold text-slate-800">
                              {n.displayName}
                            </span>
                            {n.isIdVerified && (
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                            )}
                          </div>
                          <span className="text-xs text-slate-500">
                            {n.neighborhood}, {n.district} • {n.role.replace('_', ' ')}
                          </span>
                        </div>
                      </div>

                      {isCurrent ? (
                        <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                          Active
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="text-xs font-medium text-slate-600 hover:text-emerald-700 bg-white border border-slate-200 px-2.5 py-1 rounded-lg"
                        >
                          Switch
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
