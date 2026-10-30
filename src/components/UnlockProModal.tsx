import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  CheckCircle2,
  Key,
  KeyRound,
  ShieldCheck,
  Zap,
  ArrowRight,
  Lock,
  BookOpen,
} from 'lucide-react';
import { useLicenseStore } from '../store/licenseStore';
import { BrainAiFlashLine } from './icons/BrainAiFlashLine';

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
  const [licenseKey, setLicenseKey] = useState('');
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
    if (!licenseKey.trim()) return;

    const result = verifyKey(licenseKey.trim());
    setFeedback(result);

    if (result.success) {
      setTimeout(() => {
        setFeedback(null);
        setLicenseKey('');
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
        className="relative z-[121] w-full max-w-md rounded-3xl bg-[#131722] p-6 sm:p-7 shadow-2xl border border-slate-800 space-y-5 animate-in fade-in zoom-in-95 duration-200 my-auto text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-400 flex items-center justify-center shadow-md shadow-amber-500/20 text-2xl text-white">
              👑
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-extrabold text-white font-serif">
                  Spellbean Pro
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase">
                  Lifetime
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
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
              <BrainAiFlashLine className="w-5 h-5 text-amber-400" />
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

          <div className="bg-slate-900/80 dark:bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <span className="text-base font-bold text-slate-100 dark:text-white block">
                Full 1,604 SOTP Word Syllabus
              </span>
              <p className="text-xs text-slate-400 dark:text-slate-300 leading-relaxed mt-0.5">
                Unlocks all 1,604 convention competition words across all rounds, removing the 100-word free preview limit.
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

              <p className="text-[11px] text-center text-slate-400 flex items-center justify-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>One-time payment • Instant activation • No subscriptions</span>
              </p>
            </div>

            {/* Section Divider ("OR ENTER LICENSE KEY / PROMO CODE") */}
            <div className="relative my-4 flex items-center justify-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-800"></div>
              </div>
              <span className="relative px-3 bg-[#131722] text-[11px] font-bold tracking-widest text-slate-400 uppercase">
                Or enter license key / promo code
              </span>
            </div>

            {/* Manual Key / Promo Code Activation */}
            <form onSubmit={handleVerify} className="space-y-3">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                  <input
                    type="text"
                    value={licenseKey}
                    onChange={(e) => setLicenseKey(e.target.value.toUpperCase())}
                    placeholder="E.G. SPELLCHAMP2027 OR PRO-XXXX"
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-900/90 dark:bg-slate-950/80 border border-slate-700 focus:border-amber-500 text-white dark:text-slate-100 placeholder-slate-500 text-sm font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-amber-500/40 transition-all uppercase"
                  />
                </div>
                <button
                  type="submit"
                  onClick={handleVerify}
                  className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 font-semibold text-sm flex items-center gap-1.5 transition-all shrink-0"
                >
                  Verify <span>&rarr;</span>
                </button>
              </div>

              {feedback && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                    feedback.success
                      ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800'
                      : 'bg-rose-950/60 text-rose-300 border border-rose-800'
                  }`}
                >
                  {feedback.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <X className="w-4 h-4 text-rose-400 shrink-0" />
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

