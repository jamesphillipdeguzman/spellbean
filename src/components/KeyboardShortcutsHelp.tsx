import React from 'react';
import { X, Keyboard } from 'lucide-react';

interface KeyboardShortcutsHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsHelp: React.FC<KeyboardShortcutsHelpProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'Space', desc: 'Pronounce word twice with 2-second pause (Official Cadence)' },
    { key: 'R', desc: 'Repeat word once' },
    { key: 'D', desc: 'Pronounce and display definition' },
    { key: 'P', desc: 'Pronounce and display part of speech' },
    { key: 'S', desc: 'Pronounce and display example sentence in context (word masked)' },
    { key: 'Enter', desc: 'Submit typed spelling / Reveal pen & paper spelling' },
    { key: '1', desc: 'Mark "Got it" / Correct (in Pen & Paper mode)' },
    { key: '2', desc: 'Mark "Missed it" / Incorrect (in Pen & Paper mode)' },
    { key: 'Esc', desc: 'Close any active modal dialog' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div
        className="w-full max-w-lg bg-white dark:bg-warm-900 rounded-3xl shadow-2xl border border-warm-200 dark:border-warm-800 p-6 space-y-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-warm-100 dark:border-warm-800 pb-4">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
              <Keyboard className="w-5 h-5" />
            </span>
            <h3 className="text-xl font-bold font-serif text-warm-900 dark:text-warm-50">
              Contest Keyboard Shortcuts
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-warm-400 hover:text-warm-600 dark:hover:text-warm-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3">
          {shortcuts.map((sc) => (
            <div
              key={sc.key}
              className="flex items-center justify-between p-2.5 rounded-xl bg-warm-50 dark:bg-warm-850 border border-warm-200 dark:border-warm-800 text-xs"
            >
              <span className="text-warm-700 dark:text-warm-300 font-medium">{sc.desc}</span>
              <kbd className="px-2.5 py-1 font-mono font-bold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-800 rounded-lg shadow-2xs">
                {sc.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="pt-2 text-center">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-warm-900 dark:bg-warm-100 text-white dark:text-warm-900 text-xs font-bold hover:bg-warm-800 transition-colors"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};

