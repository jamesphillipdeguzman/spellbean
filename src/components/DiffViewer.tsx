import React from 'react';
import { computeCharacterDiff, DiffCharType } from '../services/diff';
import { AlertCircle, ArrowLeftRight, Check, X } from 'lucide-react';

interface DiffViewerProps {
  userInput: string;
  expectedWord: string;
}

export const DiffViewer: React.FC<DiffViewerProps> = ({ userInput, expectedWord }) => {
  const diff = computeCharacterDiff(userInput, expectedWord);

  if (diff.isMatch) {
    return (
      <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 rounded-xl border border-emerald-200 dark:border-emerald-800 text-sm font-medium">
        <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
        <span>Exact match! Perfect spelling.</span>
      </div>
    );
  }

  const { missingCount, extraCount, substitutionCount, transpositionCount } = diff.summary;

  const renderBadge = (char: string, type: DiffCharType, index: number, isExpected = false) => {
    switch (type) {
      case 'match':
        return (
          <span
            key={index}
            className="inline-flex items-center justify-center min-w-[28px] h-8 px-1 font-mono font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 rounded border border-emerald-300 dark:border-emerald-700"
            title="Correct letter"
          >
            {char}
          </span>
        );
      case 'transposition':
        return (
          <span
            key={index}
            className="inline-flex items-center justify-center min-w-[28px] h-8 px-1 font-mono font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-900/60 rounded border-2 border-indigo-400 dark:border-indigo-600 relative group"
            title="Transposed letters (swapped position)"
          >
            {char}
            <ArrowLeftRight className="w-2.5 h-2.5 text-indigo-500 absolute -top-1.5 -right-1.5 bg-white dark:bg-warm-900 rounded-full" />
          </span>
        );
      case 'substitution':
        return (
          <span
            key={index}
            className="inline-flex items-center justify-center min-w-[28px] h-8 px-1 font-mono font-bold text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-900/60 rounded border border-rose-300 dark:border-rose-700 line-through decoration-rose-500"
            title="Incorrect letter"
          >
            {char}
          </span>
        );
      case 'extra':
        return (
          <span
            key={index}
            className="inline-flex items-center justify-center min-w-[28px] h-8 px-1 font-mono font-bold text-rose-800 dark:text-rose-200 bg-rose-200 dark:bg-rose-950 rounded border border-rose-400 dark:border-rose-800 line-through"
            title="Extra letter typed"
          >
            {char}
          </span>
        );
      case 'missing':
        return (
          <span
            key={index}
            className="inline-flex items-center justify-center min-w-[28px] h-8 px-1 font-mono font-bold text-amber-800 dark:text-amber-200 bg-amber-100 dark:bg-amber-900/60 rounded border-2 border-dashed border-amber-500 dark:border-amber-400 animate-pulse"
            title="Missing letter"
          >
            {char}
          </span>
        );
    }
  };

  return (
    <div className="bg-warm-50 dark:bg-warm-900/80 rounded-xl p-4 border border-warm-200 dark:border-warm-700 shadow-inner">
      <div className="flex items-center gap-2 mb-3 text-xs font-semibold uppercase tracking-wider text-warm-500 dark:text-warm-400">
        <AlertCircle className="w-4 h-4 text-amber-500" />
        <span>Spelling Discrepancy Analysis</span>
      </div>

      <div className="space-y-3">
        {/* Expected official word */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
          <span className="text-xs font-semibold text-warm-600 dark:text-warm-300 w-28 shrink-0">
            Official Spelling:
          </span>
          <div className="flex flex-wrap items-center gap-1">
            {diff.expectedAnnotated.map((item, idx) => renderBadge(item.char, item.type, idx, true))}
          </div>
        </div>

        {/* User typed input */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
          <span className="text-xs font-semibold text-warm-600 dark:text-warm-300 w-28 shrink-0">
            Your Entry:
          </span>
          <div className="flex flex-wrap items-center gap-1">
            {diff.userAnnotated.map((item, idx) => renderBadge(item.char, item.type, idx, false))}
          </div>
        </div>
      </div>

      {/* Summary tags */}
      <div className="mt-4 pt-3 border-t border-warm-200 dark:border-warm-700 flex flex-wrap items-center gap-2 text-xs">
        {transpositionCount > 0 && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-medium">
            <ArrowLeftRight className="w-3 h-3" />
            Transposition ({transpositionCount / 2} pair)
          </span>
        )}
        {missingCount > 0 && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-medium">
            <X className="w-3 h-3" />
            {missingCount} missing {missingCount === 1 ? 'letter' : 'letters'}
          </span>
        )}
        {extraCount > 0 && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-medium">
            <X className="w-3 h-3" />
            {extraCount} extra {extraCount === 1 ? 'letter' : 'letters'}
          </span>
        )}
        {substitutionCount > 0 && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-medium">
            <AlertCircle className="w-3 h-3" />
            {substitutionCount} incorrect {substitutionCount === 1 ? 'letter' : 'letters'}
          </span>
        )}
      </div>
    </div>
  );
};
