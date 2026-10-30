import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { DailyPractice } from './components/DailyPractice';
import { MockBee } from './components/MockBee';
import { MissedVault } from './components/MissedVault';
import { WordBank } from './components/WordBank';
import { SettingsModal } from './components/SettingsModal';
import { KeyboardShortcutsHelp } from './components/KeyboardShortcutsHelp';
import { useSpellingStore } from './store/useSpellingStore';

export const App: React.FC = () => {
  const activeTab = useSpellingStore((s) => s.activeTab);
  const darkMode = useSpellingStore((s) => s.settings.darkMode);
  const [showShortcuts, setShowShortcuts] = useState(false);

  // Synchronize darkMode class on root
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Global hotkeys for shortcut modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');

      if (e.key === '?' && !isInput) {
        e.preventDefault();
        setShowShortcuts((prev) => !prev);
      }

      if (e.key === 'Escape') {
        setShowShortcuts(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-warm-100 dark:bg-warm-950 text-warm-900 dark:text-warm-100 flex flex-col font-sans transition-colors selection:bg-amber-200 dark:selection:bg-amber-900 selection:text-amber-900 dark:selection:text-amber-100">
      <Header onOpenShortcuts={() => setShowShortcuts(true)} />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {activeTab === 'daily' && <DailyPractice />}
        {activeTab === 'mockbee' && <MockBee />}
        {activeTab === 'vault' && <MissedVault />}
        {activeTab === 'wordbank' && <WordBank />}
        {activeTab === 'settings' && <SettingsModal />}
      </main>

      {/* Footer */}
      <footer className="border-t border-warm-200 dark:border-warm-850 py-6 text-center text-xs text-warm-500 dark:text-warm-400">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>
            <strong>Spellbean</strong> — Official trainer for SOT®P Student Convention Spelling Events.
          </p>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowShortcuts(true)}
              className="hover:text-warm-800 dark:hover:text-warm-200 underline underline-offset-2"
            >
              Shortcuts (?)
            </button>
            <span>•</span>
            <span>1,604 Official Words Ingested</span>
            <span>•</span>
            <span>100% Offline Capable</span>
          </div>
        </div>
      </footer>

      {/* Shortcuts Modal */}
      <KeyboardShortcutsHelp
        isOpen={showShortcuts}
        onClose={() => setShowShortcuts(false)}
      />
    </div>
  );
};

export default App;

