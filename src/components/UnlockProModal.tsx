import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Sparkles,
  X,
  CheckCircle2,
  KeyRound,
  ShieldCheck,
  Zap,
  ArrowRight,
  Lock,
} from 'lucide-react';
import { useLicenseStore } from '../store/licenseStore';

export interface UnlockProModalProps {
  isOpen: boolean;
  onClose: () => void;
  reason?: string;
}

export const UnlockProModal: React.FC<UnlockProModalProps> = ({
  isOpen,
  onClose,
  reason,
}) => {
  const { isProUnlocked, verifyKey, licenseCode, relockPro } = useLicenseStore();
  const [licenseInput, setLicenseInput] = useState('');
  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === 'undefined') {
    return null;
  }

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (!licenseInput.trim()) return;

    const result = verifyKey(licenseInput.trim());
    setFeedback(result);

    if (result.success) {
      setTimeout(() => {
        setFeedback(null);
        setLicenseInput('');
        onClose();
      }, 1500);
    }
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative z-[121] w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 p-6 sm:p-7 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 animate-in fade-in zoom-in-95 duration-200 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-400 flex items-center justify-center shadow-md shadow-amber-500/20 text-2xl text-white">
              👑
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 font-serif">
                  Spellbean Pro
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300/60 uppercase">
                  Lifetime
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Studio Neural Voices & Custom Word Ingestion
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dynamic reason alert if triggered by feature gate */}
        {reason && (
          <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
            <Lock className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-bold">Pro Feature Required</p>
              <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">{reason}</p>
            </div>
          </div>
        )}

        {/* Feature Highlights */}
        <div className="space-y-3 py-1">
          <div className="bg-slate-900/80 dark:bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 fill-current" />
            </div>
            <div>
              <span className="text-base font-bold text-slate-100 dark:text-white block">
                Realistic Neural Studio Voices
              </span>
              <p className="text-xs text-slate-400 dark:text-slate-300 leading-relaxed mt-0.5">
                Authentic Philippine English proctors (James & Rosa Neural) and Jenny US for authentic convention drills.
              </p>
            </div>
          </div>

          <div className="bg-slate-900/80 dark:bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <span className="text-base font-bold text-slate-100 dark:text-white block">
                Full Document Ingestion Hub
              </span>
              <p className="text-xs text-slate-400 dark:text-slate-300 leading-relaxed mt-0.5">
                Parse school bee wordlists directly from Excel workbooks (.xlsx) and PDF competition booklets.
              </p>
            </div>
          </div>
        </div>

        {isProUnlocked ? (
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-center space-y-2">
            <div className="flex items-center justify-center gap-1.5 text-emerald-700 dark:text-emerald-300 font-bold text-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              <span>Spellbean Pro is Active!</span>
            </div>
            <p className="text-xs text-emerald-600 dark:text-emerald-400">
              License: <span className="font-mono font-bold">{licenseCode || 'LIFETIME'}</span>
            </p>
            <button
              onClick={() => {
                relockPro();
                setFeedback({ success: false, message: 'Pro relocked for testing.' });
              }}
              className="text-[11px] text-warm-400 hover:text-warm-600 underline pt-1"
            >
              Relock (Development Test)
            </button>
          </div>
        ) : (
          <>
            {/* Primary PayMongo Checkout CTA */}
            <div className="space-y-2">
              <a
                href="https://pm.link/org-gaeypCEUR9YGrVTZSG6ejSZd/H69lMME"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3.5 px-6 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-base shadow-lg shadow-amber-500/25 transition-all hover:scale-[1.02] active:scale-95 text-center"
              >
                <span>⚡</span> Unlock Lifetime Access — ₱399 (GCash / Maya / Card)
              </a>

              <p className="text-[11px] text-center text-warm-500 dark:text-warm-400 flex items-center justify-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>One-time payment • Instant activation • No subscriptions</span>
              </p>
            </div>

            {/* Divider */}
            <div className="relative flex items-center justify-center my-1">
              <div className="border-t border-warm-200 dark:border-warm-800 w-full" />
              <span className="bg-white dark:bg-warm-900 px-3 text-[11px] text-warm-400 font-medium uppercase tracking-wider shrink-0">
                Or Enter License Key / Promo Code
              </span>
            </div>

            {/* Manual Key / Promo Code Activation */}
            <form onSubmit={handleVerify} className="space-y-2">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-warm-400" />
                  <input
                    type="text"
                    value={licenseInput}
                    onChange={(e) => setLicenseInput(e.target.value)}
                    placeholder="e.g. SPELLCHAMP2027 or PRO-XXXX"
                    className="w-full pl-9 pr-3 py-2 text-xs font-mono bg-warm-50 dark:bg-warm-850 border border-warm-200 dark:border-warm-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-warm-900 dark:text-warm-100 uppercase"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-warm-900 dark:bg-warm-100 hover:bg-warm-800 dark:hover:bg-white text-white dark:text-warm-900 font-bold text-xs transition active:scale-95 flex items-center gap-1 shrink-0"
                >
                  <span>Verify</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {feedback && (
                <div
                  className={`p-2.5 rounded-xl text-xs flex items-center gap-2 ${
                    feedback.success
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                      : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                  }`}
                >
                  {feedback.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  ) : (
                    <X className="w-4 h-4 text-rose-500 shrink-0" />
                  )}
                  <span>{feedback.message}</span>
                </div>
              )}
            </form>
          </>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default UnlockProModal;

