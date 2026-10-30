import React from 'react';
import {
  Sparkles,
  Flame,
  Award,
  AlertTriangle,
  BookOpen,
  Trophy,
  Settings,
  HelpCircle,
  Moon,
  Sun,
  Target,
} from 'lucide-react';
import { useSpellingStore } from '../store/useSpellingStore';

interface HeaderProps {
  onOpenShortcuts: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenShortcuts }) => {
  const store = useSpellingStore();
  const {
    activeTab,
    setActiveTab,
    settings,
    updateSettings,
    words,
    todayCompletedCount,
    getDailyTargetQuota,
    consecutiveDaysStreak,
    getMissedWords,
  } = store;

  const targetQuota = getDailyTargetQuota();
  const missedCount = getMissedWords().length;
  const masteredCount = Object.values(words).filter((w) => w.status === 'mastered').length;

  const toggleDarkMode = () => {
    const nextDark = !settings.darkMode;
    updateSettings({ darkMode: nextDark });
    if (nextDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const navItems = [
    {
      id: 'daily',
      label: 'Daily Practice',
      icon: Target,
      badge: `${todayCompletedCount}/${targetQuota}`,
      badgeColor: 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300',
    },
    {
      id: 'mockbee',
      label: 'Mock Bee',
      icon: Trophy,
    },
    {
      id: 'vault',
      label: 'Missed Vault',
      icon: AlertTriangle,
      badge: missedCount > 0 ? String(missedCount) : null,
      badgeColor: 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300',
    },
    {
      id: 'wordbank',
      label: 'Word Bank',
      icon: BookOpen,
      badge: '1,604',
      badgeColor: 'bg-warm-100 dark:bg-warm-800 text-warm-700 dark:text-warm-300',
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
    },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/90 dark:bg-warm-900/90 backdrop-blur-md border-b border-warm-200 dark:border-warm-800 shadow-2xs">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Top Brand Bar */}
        <div className="py-3 flex items-center justify-between border-b border-warm-100 dark:border-warm-800/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-400 flex items-center justify-center shadow-md shadow-amber-500/20 text-xl transform hover:rotate-6 transition-transform cursor-pointer">
              🐝
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xl tracking-tight text-warm-950 dark:text-warm-50 font-serif">
                  Spellbean
                </span>
                <span className="hidden md:inline-block text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300/40">
                  STUDY COMPANION • 1,604 WORDS
                </span>
              </div>
              <p className="text-[11px] text-warm-500 dark:text-warm-400 font-medium">
                Independent Practice & Study Trainer for Student Convention Spellers
              </p>
            </div>
          </div>

          {/* Quick Metrics & Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Streak */}
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-warm-100 dark:bg-warm-800 text-warm-700 dark:text-warm-200 text-xs font-bold"
              title="Consecutive Days Practiced"
            >
              <Flame className="w-4 h-4 text-amber-500 fill-amber-500" />
              <span>{consecutiveDaysStreak}d</span>
            </div>

            {/* Mastered Words Pill */}
            <div
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold"
              title="Words Mastered (3 consecutive error-free recalls)"
            >
              <Award className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>{masteredCount} / 1,604</span>
            </div>

            {/* Dark Mode Toggle */}
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-xl text-warm-500 hover:text-warm-800 dark:hover:text-warm-100 hover:bg-warm-100 dark:hover:bg-warm-800 transition-colors"
              title={settings.darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {settings.darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Shortcuts Help */}
            <button
              onClick={onOpenShortcuts}
              className="p-2 rounded-xl text-warm-500 hover:text-warm-800 dark:hover:text-warm-100 hover:bg-warm-100 dark:hover:bg-warm-800 transition-colors"
              title="Keyboard Shortcuts"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <nav className="flex items-center gap-1 sm:gap-2 overflow-x-auto py-2 no-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`relative flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-amber-500 text-white shadow-sm shadow-amber-500/25'
                    : 'text-warm-600 dark:text-warm-300 hover:text-warm-900 dark:hover:text-white hover:bg-warm-100 dark:hover:bg-warm-800'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-warm-400 dark:text-warm-500'}`} />
                <span>{item.label}</span>
                {item.badge && (
                  <span
                    className={`ml-0.5 text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                      isActive ? 'bg-amber-600 text-white' : item.badgeColor
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};

