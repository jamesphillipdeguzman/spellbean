import React, { useState, useEffect } from 'react';

interface FooterProps {
  onOpenShortcuts?: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenShortcuts }) => {
  const [visitsCount, setVisitsCount] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    async function recordVisit() {
      try {
        const response = await fetch('https://api.counterapi.dev/v1/spellbean/visits/up', {
          signal: controller.signal,
        });
        if (!response.ok) return;
        const data = await response.json();
        if (isMounted && typeof data?.count === 'number') {
          setVisitsCount(data.count);
        }
      } catch (err) {
        // Gracefully fail silently if offline or blocked by adblockers/network
      }
    }

    recordVisit();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, []);

  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full border-t border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm py-6 px-4 text-center text-xs text-slate-500 dark:text-slate-400">
      <div className="max-w-4xl mx-auto space-y-3">
        {/* Top Badges & Hit Counter */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
          {/* Version Badge Pill */}
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 dark:border-blue-800 border border-blue-200">
            Spellbean v1.0.0
          </span>

          {/* Real-time Visitor Hit Counter */}
          {visitsCount !== null && (
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 animate-in fade-in duration-300"
              title="Total visitor count recorded via CounterAPI"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>{visitsCount.toLocaleString()} visits</span>
            </span>
          )}
        </div>

        {/* Brand & Author Attribution */}
        <div className="text-xs text-slate-600 dark:text-slate-300">
          <span>© {currentYear} Spellbean • Crafted with care by </span>
          <a
            href="https://jamesdeguzman.com"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-slate-800 dark:text-slate-100 hover:text-amber-600 dark:hover:text-amber-400 transition-colors underline underline-offset-2"
          >
            James Phillip De Guzman
          </a>
        </div>

        {/* Convention Study Companion Metadata Line */}
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] text-slate-400 dark:text-slate-500">
          <span>Convention Study Companion</span>
          <span>•</span>
          <span>1,604 Words Ingested</span>
          <span>•</span>
          <span>100% Offline Capable</span>
          {onOpenShortcuts && (
            <>
              <span>•</span>
              <button
                onClick={onOpenShortcuts}
                className="hover:text-slate-700 dark:hover:text-slate-300 underline underline-offset-2 transition-colors"
              >
                Shortcuts (?)
              </button>
            </>
          )}
        </div>

        {/* Disclaimer */}
        <p className="text-[11px] leading-relaxed text-slate-400 dark:text-slate-500 max-w-2xl mx-auto pt-1 border-t border-slate-100 dark:border-slate-850">
          <strong>Disclaimer:</strong> Spellbean is an independent, non-commercial study companion created to help students prepare for convention spelling events. It is not affiliated with, authorized, maintained, sponsored, or officially endorsed by School of Tomorrow® Philippines or Accelerated Christian Education, Inc.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
