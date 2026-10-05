import React, { useState, useEffect } from 'react';
import {
  X,
  Shield,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Lock,
  Eye,
  Sparkles,
  MapPin,
  Package,
} from 'lucide-react';
import { TASK_CATEGORIES, TaskCategory } from '../../lib/task-policy.ts';
import { ISTANBUL_NEIGHBORHOODS, NeighborhoodLocation } from '../../lib/geo.ts';
import { CreateTaskInput, Task } from '../../types/index.ts';
import { api } from '../../api/client.ts';
import { useAuth } from '../../context/AuthContext.tsx';

interface CreateTaskWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onTaskCreated: (task: Task) => void;
}

export const CreateTaskWizard: React.FC<CreateTaskWizardProps> = ({
  isOpen,
  onClose,
  onTaskCreated,
}) => {
  const { user } = useAuth();

  const [step, setStep] = useState<number>(1);
  const [categoryId, setCategoryId] = useState<string>('package-transport');
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [neighborhoodKey, setNeighborhoodKey] = useState<string>('moda-kadikoy');
  const [destinationDistrict, setDestinationDistrict] = useState<string>('Beşiktaş');
  const [destinationNeighborhood, setDestinationNeighborhood] = useState<string>('Akaretler');
  const [pickupAddressSensitive, setPickupAddressSensitive] = useState<string>('');
  const [rewardLira, setRewardLira] = useState<number>(150);
  const [estimatedMinutes, setEstimatedMinutes] = useState<number>(30);
  const [openInspectionAgreed, setOpenInspectionAgreed] = useState<boolean>(false);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setErrorMsg(null);
      setOpenInspectionAgreed(false);
      // Pre-fill realistic sample for testing
      setTitle('Kadıköy to Beşiktaş: Need small book handed to friend at ferry');
      setDescription('Travelling to Beşiktaş or Kadıköy ferry pier today? Need a novel handed to my student friend at the Beşiktaş pier turnstiles. Item is completely open for physical inspection before transit.');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const selectedCategory = TASK_CATEGORIES.find(c => c.id === categoryId);

  const handleNext = () => {
    setErrorMsg(null);
    if (step === 1) {
      if (selectedCategory?.policy === 'PROHIBITED') {
        setErrorMsg(`"${selectedCategory.name}" is prohibited by neighborhood safety guidelines.`);
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (title.trim().length < 5) {
        setErrorMsg('Title must be at least 5 characters long.');
        return;
      }
      if (description.trim().length < 15) {
        setErrorMsg('Please describe your need in more detail (at least 15 characters).');
        return;
      }
      setStep(3);
    } else if (step === 3) {
      setStep(4);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!openInspectionAgreed) {
      setErrorMsg('You must agree to the Open Package Inspection Protocol.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    const payload: CreateTaskInput = {
      categoryId,
      title: title.trim(),
      description: description.trim(),
      neighborhoodKey,
      destinationDistrict: destinationDistrict.trim() || undefined,
      destinationNeighborhood: destinationNeighborhood.trim() || undefined,
      pickupAddressSensitive: pickupAddressSensitive.trim() || undefined,
      rewardLira: Number(rewardLira) || 0,
      estimatedMinutes: Number(estimatedMinutes) || 30,
      openInspectionAgreed: true,
    };

    try {
      const res = await api.createTask(payload);
      if (res.success) {
        onTaskCreated(res.task);
        onClose();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to publish neighborhood request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        {/* Wizard Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                Step {step} of 4
              </span>
              <h3 className="font-bold text-slate-800 text-base">Request Neighborhood Help</h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Secure, verified peer-to-peer assistance
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {errorMsg && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-rose-800 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <div>
                <strong>Safety Policy Notice:</strong> {errorMsg}
              </div>
            </div>
          )}

          {/* STEP 1: CATEGORY SELECTION */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Select Assistance Category
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {TASK_CATEGORIES.map(cat => {
                    const isProhibited = cat.policy === 'PROHIBITED';
                    const isSelected = categoryId === cat.id;

                    return (
                      <div
                        key={cat.id}
                        onClick={() => setCategoryId(cat.id)}
                        className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                          isSelected
                            ? 'border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-500/20 shadow-xs'
                            : isProhibited
                            ? 'border-rose-200 bg-rose-50/30 opacity-75'
                            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm text-slate-800">{cat.name}</span>
                          {isProhibited ? (
                            <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded">
                              PROHIBITED
                            </span>
                          ) : cat.policy === 'RESTRICTED' ? (
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                              RESTRICTED
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                              ALLOWED
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                          {cat.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {selectedCategory && (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
                  <span className="font-bold text-slate-800">Safety Policy Note: </span>
                  {selectedCategory.safetyGuidelines}
                </div>
              )}
            </div>
          )}

          {/* STEP 2: TITLE & DESCRIPTION */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Request Summary (Title)
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Kadıköy to Beşiktaş: Small architectural sketchbook delivery"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  maxLength={120}
                  required
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Keep it concise and clear for nearby neighbors.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Detailed Description & Context
                </label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Describe exact item dimensions, weight, time frame, and public meeting points..."
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  maxLength={1000}
                  required
                />
              </div>

              <div className="p-3 rounded-xl bg-emerald-50/80 border border-emerald-200 flex items-start gap-2.5 text-xs text-emerald-900">
                <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>AI & Policy Screening Active:</strong> All submissions are automatically evaluated against the neighborhood safety model. Prohibited items, sealed packages, or private residence entry will be blocked.
                </span>
              </div>
            </div>
          )}

          {/* STEP 3: LOCATION & DESTINATION */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Your Neighborhood Zone (Public Centroid)
                </label>
                <select
                  value={neighborhoodKey}
                  onChange={e => setNeighborhoodKey(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                >
                  {Object.entries(ISTANBUL_NEIGHBORHOODS).map(([key, loc]) => (
                    <option key={key} value={key}>
                      {loc.neighborhood}, {loc.district}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  In discovery feeds, this location is obscured with a ~500m privacy jitter.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Drop-off District (Optional)
                  </label>
                  <input
                    type="text"
                    value={destinationDistrict}
                    onChange={e => setDestinationDistrict(e.target.value)}
                    placeholder="e.g. Beşiktaş"
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Drop-off Neighborhood
                  </label>
                  <input
                    type="text"
                    value={destinationNeighborhood}
                    onChange={e => setDestinationNeighborhood(e.target.value)}
                    placeholder="e.g. Akaretler"
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Precise Building / Pickup Notes (Confidential)
                </label>
                <input
                  type="text"
                  value={pickupAddressSensitive}
                  onChange={e => setPickupAddressSensitive(e.target.value)}
                  placeholder="e.g. Moda Cd. No: 42 (Meet in front of Kemal Cinema)"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-1">
                  <Lock className="w-3.5 h-3.5 text-emerald-600" />
                  <span>
                    Encrypted on server. Strictly withheld until mutual agreement in Phase 4.
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: GRATITUDE & MANDATORY SAFETY PROTOCOL */}
          {step === 4 && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Voluntary Gratitude / Reward (₺)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="1000"
                    step="10"
                    value={rewardLira}
                    onChange={e => setRewardLira(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 text-sm font-bold rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Optional voluntary thank-you compensation
                  </span>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Est. Time Needed (Minutes)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="180"
                    step="5"
                    value={estimatedMinutes}
                    onChange={e => setEstimatedMinutes(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 text-sm font-bold rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    e.g. 20-30 mins for ferry / walk
                  </span>
                </div>
              </div>

              {/* MANDATORY OPEN INSPECTION CHECKBOX */}
              <div className="p-4 rounded-xl border-2 border-emerald-500/40 bg-emerald-50/50 space-y-2">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="openInspection"
                    checked={openInspectionAgreed}
                    onChange={e => setOpenInspectionAgreed(e.target.checked)}
                    className="mt-1 w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                  />
                  <label htmlFor="openInspection" className="text-xs text-slate-800 leading-relaxed cursor-pointer">
                    <strong className="text-slate-900 block font-bold mb-0.5">
                      Mandatory Open Package Inspection Agreement
                    </strong>
                    I certify that this item is safe, legal, and that I will permit the neighbor assisting me to visually inspect all contents at physical handover. I understand sealed, unopened, or uninspected items violate platform policy.
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Wizard Controls Footer */}
        <div className="p-5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <button
              type="button"
              onClick={handleNext}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <span>Continue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || !openInspectionAgreed}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Publish Request</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
