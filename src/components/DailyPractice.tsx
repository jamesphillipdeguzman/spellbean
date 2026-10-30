import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  ArrowRight,
  CheckCircle2,
  XCircle,
  Eye,
  Keyboard,
  FileEdit,
  RotateCcw,
  Target,
  Trophy,
  Flame,
  Calendar,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import { useSpellingStore } from '../store/useSpellingStore';
import { useLicenseStore } from '../store/licenseStore';
import { ProctorVoiceControls } from './ProctorVoiceControls';
import { DiffViewer } from './DiffViewer';
import { audioService } from '../services/audio';

export const DailyPractice: React.FC = () => {
  const store = useSpellingStore();
  const {
    words,
    dailySessionWords,
    dailySessionIndex,
    dailySessionResults,
    isDailySessionActive,
    dailySessionCompleted,
    todayCompletedCount,
    consecutiveDaysStreak,
    settings,
    getDailyTargetQuota,
    getRemainingDaysUntilTarget,
    startDailySession,
    submitDailyWord,
    nextDailyWord,
    previousDailyWord,
    endDailySession,
    updateSettings,
    setActiveTab,
  } = store;
  const isPro = useLicenseStore((s) => s.isProUnlocked);

  // Local state for current word attempt
  const [typedInput, setTypedInput] = useState('');
  const [hasEvaluated, setHasEvaluated] = useState(false);
  const [isPaperRevealed, setIsPaperRevealed] = useState(false);
  const [lastSubmittedResult, setLastSubmittedResult] = useState<boolean | null>(null);
  const [batchSizeChoice, setBatchSizeChoice] = useState<number>(settings.dailyGoal || 30);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentWord = dailySessionWords[dailySessionIndex] || '';
  const currentRecord = words[currentWord.toLowerCase()];
  const inputMode = settings.inputMode;

  const targetQuota = getDailyTargetQuota();
  const remainingDays = getRemainingDaysUntilTarget();
  const unmasteredCount = Object.values(words).filter((w) => w.status !== 'mastered').length;
  const masteredCount = Object.values(words).filter((w) => w.status === 'mastered').length;

  // Whenever current word index changes, reset inputs
  useEffect(() => {
    setTypedInput('');
    setHasEvaluated(false);
    setIsPaperRevealed(false);
    setLastSubmittedResult(null);

    // Focus input for typing mode
    if (inputMode === 'typing') {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [dailySessionIndex, isDailySessionActive, inputMode]);

  // Trigger celebration on session complete
  useEffect(() => {
    if (dailySessionCompleted && isDailySessionActive) {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#F59E0B', '#10B981', '#3B82F6', '#8B5CF6'],
        });
      } catch (e) {}
    }
  }, [dailySessionCompleted, isDailySessionActive]);

  // Global keydown handler for fast drills
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in userNotes or other inputs
      const target = e.target as HTMLElement;
      const isInputFocused = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');

      // Space to trigger official pronunciation if not typing in input
      if (e.code === 'Space' && !isInputFocused) {
        e.preventDefault();
        // Handled inside ProctorVoiceControls
      }

      // Enter key
      if (e.key === 'Enter') {
        if (inputMode === 'paper') {
          if (!isPaperRevealed) {
            e.preventDefault();
            setIsPaperRevealed(true);
            audioService.playClickTone();
          }
        }
      }

      // 1: Got it (in paper mode revealed)
      if (e.key === '1' && inputMode === 'paper' && isPaperRevealed && !hasEvaluated) {
        e.preventDefault();
        handlePaperReport(true);
      }

      // 2: Missed it (in paper mode revealed)
      if (e.key === '2' && inputMode === 'paper' && isPaperRevealed && !hasEvaluated) {
        e.preventDefault();
        handlePaperReport(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [inputMode, isPaperRevealed, hasEvaluated, currentWord]);

  // Handle typing submission
  const handleTypingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!typedInput.trim() || hasEvaluated) return;

    const isCorrect = typedInput.trim().toLowerCase() === currentWord.trim().toLowerCase();
    setHasEvaluated(true);
    setLastSubmittedResult(isCorrect);
    submitDailyWord(currentWord, isCorrect);

    if (isCorrect) {
      if (settings.soundEffects) audioService.playCorrectChime();
    } else {
      if (settings.soundEffects) audioService.playIncorrectCue();
    }
  };

  // Handle paper self-reporting
  const handlePaperReport = (isCorrect: boolean) => {
    setHasEvaluated(true);
    setLastSubmittedResult(isCorrect);
    submitDailyWord(currentWord, isCorrect);

    if (isCorrect) {
      if (settings.soundEffects) audioService.playCorrectChime();
    } else {
      if (settings.soundEffects) audioService.playIncorrectCue();
    }
  };

  const handleNextWord = () => {
    nextDailyWord();
  };

  // Mode Switcher toggle
  const toggleInputMode = (mode: 'typing' | 'paper') => {
    updateSettings({ inputMode: mode });
  };

  // Calculate session accuracy
  const sessionTotalAnswered = Object.keys(dailySessionResults).length;
  const sessionCorrectCount = Object.values(dailySessionResults).filter(Boolean).length;
  const sessionAccuracy = sessionTotalAnswered > 0 ? Math.round((sessionCorrectCount / sessionTotalAnswered) * 100) : 100;

  // If no active session, show the Session Launcher / Daily Quota Engine Hub
  if (!isDailySessionActive) {
    const missedVaultCount = store.getMissedWords().length;

    return (
      <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn">
        {/* Welcome Hero Banner (Split Banner) */}
        <div className="bg-white dark:bg-warm-900 rounded-3xl p-6 sm:p-8 border border-warm-200 dark:border-warm-800 shadow-sm overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            {/* Left Content Column */}
            <div className="md:col-span-7 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 text-xs font-bold uppercase tracking-wider border border-amber-200 dark:border-amber-800/60">
                <img 
                  src="/lightbulb-flash-line.svg" 
                  alt="Lightbulb" 
                  className="w-4 h-4 text-amber-500 inline-block align-middle brightness-125" 
                />
                <span>Small Bean, Big Words</span>
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold font-serif tracking-tight text-warm-950 dark:text-warm-50 leading-tight">
                Train Daily for the Student Convention
              </h1>
              <p className="text-sm text-warm-600 dark:text-warm-300 leading-relaxed">
                Master all 1,604 vocabulary words with an authentic virtual proctor, audio double-pronunciation cadence, and dual pen-and-paper or typing practice modes.
              </p>

              {/* Quick Feature Badges */}
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-warm-100 dark:bg-warm-800 text-warm-700 dark:text-warm-200 font-medium">
                  <Target className="w-3.5 h-3.5 text-amber-500" />
                  {remainingDays} Days to Convention
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-warm-100 dark:bg-warm-800 text-warm-700 dark:text-warm-200 font-medium">
                  <Trophy className="w-3.5 h-3.5 text-amber-500" />
                  {masteredCount} Mastered (3x)
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-warm-100 dark:bg-warm-800 text-warm-700 dark:text-warm-200 font-medium">
                  <Flame className="w-3.5 h-3.5 text-amber-500" />
                  {consecutiveDaysStreak} Day Streak
                </span>
              </div>
            </div>

            {/* Right Image Column */}
            <div className="md:col-span-5 flex justify-center">
              <div className="relative w-full max-w-sm rounded-2xl overflow-hidden ring-4 ring-amber-100 dark:ring-amber-950/60 shadow-md">
                <img
                  src="/hero.webp"
                  alt="Spelling bee student studying"
                  className="object-cover w-full h-56 sm:h-64 md:h-72 max-h-72 md:max-h-80 rounded-2xl border border-amber-100 dark:border-amber-900/40 shadow-sm transition-transform duration-300 hover:scale-105"
                  loading="eager"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Daily Quota & Convention Countdown Hero */}
        <div className="bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-amber-500/10 relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-amber-100 text-xs font-semibold">
                <Target className="w-3.5 h-3.5" />
                <span>Convention Milestone: February 2027</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold font-serif tracking-tight text-white">
                Daily Quota Engine
              </h1>
              <p className="text-amber-100 text-sm max-w-xl leading-relaxed">
                Stay on track for the Student Convention. Your target pace is dynamically computed to exhaust all 1,604 words with 3-streak mastery before convention day.
              </p>
            </div>

            {/* Daily Streak & Days Left Badges */}
            <div className="flex md:flex-col items-center md:items-end gap-3 w-full md:w-auto">
              <div className="flex-1 md:flex-initial flex items-center gap-3 px-4 py-2.5 bg-black/20 backdrop-blur-md rounded-2xl border border-white/10 text-white">
                <Flame className="w-5 h-5 text-amber-300 animate-pulse" />
                <div>
                  <div className="text-[10px] uppercase font-bold tracking-wider text-amber-200">Speller Streak</div>
                  <div className="text-lg font-extrabold">{consecutiveDaysStreak} Days</div>
                </div>
              </div>

              <div className="flex-1 md:flex-initial flex items-center gap-3 px-4 py-2.5 bg-black/20 backdrop-blur-md rounded-2xl border border-white/10 text-white">
                <Calendar className="w-5 h-5 text-amber-300" />
                <div>
                  <div className="text-[10px] uppercase font-bold tracking-wider text-amber-200">Convention Countdown</div>
                  <div className="text-lg font-extrabold">{remainingDays} Days Left</div>
                </div>
              </div>
            </div>
          </div>

          {/* Exhaustion Engine Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-white/20">
            <div>
              <span className="text-xs text-amber-200 block">Today's Target</span>
              <span className="text-2xl font-black">{targetQuota} words/day</span>
            </div>
            <div>
              <span className="text-xs text-amber-200 block">Completed Today</span>
              <span className="text-2xl font-black">{todayCompletedCount} words</span>
            </div>
            <div>
              <span className="text-xs text-amber-200 block">Mastered (3x)</span>
              <span className="text-2xl font-black">{masteredCount} / {isPro ? '1,604' : '100'}</span>
            </div>
            <div>
              <span className="text-xs text-amber-200 block">Remaining</span>
              <span className="text-2xl font-black">{unmasteredCount} words</span>
            </div>
          </div>
        </div>

        {/* Start Session Setup Card */}
        <div className="bg-white dark:bg-warm-900 rounded-3xl p-6 sm:p-8 border border-warm-200 dark:border-warm-800 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-warm-100 dark:border-warm-800 pb-5">
            <div>
              <h2 className="text-xl font-bold text-warm-900 dark:text-warm-50 flex items-center gap-2">
                <img 
                  src="/lightbulb-flash-line.svg" 
                  alt="Lightbulb" 
                  className="w-5 h-5 text-amber-500 inline-block align-middle brightness-125" 
                />
                Configure Today's Batch
              </h2>
              <p className="text-xs text-warm-500 dark:text-warm-400 mt-0.5">
                Each batch is optimized: 70% unmastered words + 30% reinforcement from your Missed Words Vault.
              </p>
            </div>

            {/* Input Mode Selector */}
            <div className="flex items-center p-1 bg-warm-100 dark:bg-warm-800 rounded-2xl border border-warm-200 dark:border-warm-700">
              <button
                onClick={() => toggleInputMode('typing')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  inputMode === 'typing'
                    ? 'bg-white dark:bg-warm-900 text-amber-600 dark:text-amber-400 shadow-sm'
                    : 'text-warm-600 dark:text-warm-300 hover:text-warm-900'
                }`}
              >
                <Keyboard className="w-4 h-4" />
                <span>Mode B: Typing</span>
              </button>
              <button
                onClick={() => toggleInputMode('paper')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  inputMode === 'paper'
                    ? 'bg-white dark:bg-warm-900 text-amber-600 dark:text-amber-400 shadow-sm'
                    : 'text-warm-600 dark:text-warm-300 hover:text-warm-900'
                }`}
              >
                <FileEdit className="w-4 h-4" />
                <span>Mode A: Pen & Paper</span>
              </button>
            </div>
          </div>

          {/* Batch Size Selector */}
          <div className="space-y-3">
            <label className="text-xs font-semibold text-warm-600 dark:text-warm-300 uppercase tracking-wider block">
              Select Batch Size:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[20, 30, 40, 50].map((size) => (
                <button
                  key={size}
                  onClick={() => setBatchSizeChoice(size)}
                  className={`p-4 rounded-2xl border text-center transition-all ${
                    batchSizeChoice === size
                      ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 shadow-sm ring-2 ring-amber-500/20'
                      : 'border-warm-200 dark:border-warm-800 hover:bg-warm-50 dark:hover:bg-warm-850 text-warm-700 dark:text-warm-300'
                  }`}
                >
                  <div className="text-2xl font-black">{size}</div>
                  <div className="text-xs text-warm-500 dark:text-warm-400 mt-0.5">
                    {size === 30 ? 'Recommended' : `${Math.round(size * 0.7)} new / ${Math.round(size * 0.3)} rev`}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Ratio breakdown indicator */}
          <div className="p-4 rounded-2xl bg-warm-50 dark:bg-warm-850 border border-warm-200 dark:border-warm-800 flex items-center justify-between text-xs text-warm-600 dark:text-warm-300">
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              {Math.round(batchSizeChoice * 0.7)} Unmastered & New Words
            </span>
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              {Math.min(missedVaultCount, Math.round(batchSizeChoice * 0.3))} Missed Vault Reinforcements
            </span>
          </div>

          {/* Action button */}
          <div className="pt-2">
            <button
              onClick={() => startDailySession(batchSizeChoice)}
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-lg shadow-lg shadow-amber-500/25 transition-all transform active:scale-[0.99] flex items-center justify-center gap-3"
            >
              <span>Begin Practice Session ({batchSizeChoice} Words)</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Active Session Complete Summary Screen
  if (dailySessionCompleted) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 text-center animate-fadeIn py-6">
        <div className="w-20 h-20 rounded-3xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto shadow-inner">
          <Trophy className="w-10 h-10" />
        </div>

        <div className="space-y-2">
          <h2 className="text-3xl font-extrabold font-serif text-warm-900 dark:text-warm-50">
            Practice Batch Completed!
          </h2>
          <p className="text-warm-600 dark:text-warm-300 text-sm">
            Outstanding dedication! You practiced {dailySessionWords.length} words in this session.
          </p>
        </div>

        {/* Scorecard */}
        <div className="p-6 rounded-3xl bg-white dark:bg-warm-900 border border-warm-200 dark:border-warm-800 shadow-sm space-y-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-3 rounded-2xl bg-warm-50 dark:bg-warm-850">
              <span className="text-xs text-warm-500 dark:text-warm-400 block">Total Recalled</span>
              <span className="text-2xl font-bold text-warm-900 dark:text-warm-100">
                {sessionCorrectCount} / {dailySessionWords.length}
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-warm-50 dark:bg-warm-850">
              <span className="text-xs text-emerald-600 dark:text-emerald-400 block">Batch Accuracy</span>
              <span className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                {sessionAccuracy}%
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-warm-50 dark:bg-warm-850">
              <span className="text-xs text-amber-600 dark:text-amber-400 block">Daily Quota</span>
              <span className="text-2xl font-bold text-amber-700 dark:text-amber-300">
                {todayCompletedCount} / {targetQuota}
              </span>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={() => startDailySession(batchSizeChoice)}
            className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Practice Another Batch</span>
          </button>
          <button
            onClick={endDailySession}
            className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-warm-200 dark:bg-warm-800 hover:bg-warm-300 dark:hover:bg-warm-700 text-warm-800 dark:text-warm-100 font-semibold text-sm transition-all"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Active Session Running View (Word by Word)
  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fadeIn pb-12">
      {/* Top Header: Progress & Mode Switcher */}
      <div className="flex items-center justify-between gap-4 bg-white dark:bg-warm-900 px-5 py-3.5 rounded-2xl border border-warm-200 dark:border-warm-800 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 px-2.5 py-1 rounded-lg">
            Word {dailySessionIndex + 1} of {dailySessionWords.length}
          </span>
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-warm-500 dark:text-warm-400">
            <span>Consecutive Streak:</span>
            <span className="font-bold text-warm-800 dark:text-warm-100">
              {currentRecord?.consecutiveStreak || 0} / 3
            </span>
          </div>
        </div>

        {/* Input mode indicator toggle */}
        <div className="flex items-center gap-1 p-1 bg-warm-100 dark:bg-warm-800 rounded-xl text-xs">
          <button
            onClick={() => toggleInputMode('typing')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
              inputMode === 'typing'
                ? 'bg-white dark:bg-warm-900 text-amber-600 dark:text-amber-400 shadow-xs'
                : 'text-warm-500 hover:text-warm-900 dark:text-warm-400'
            }`}
          >
            Typing
          </button>
          <button
            onClick={() => toggleInputMode('paper')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
              inputMode === 'paper'
                ? 'bg-white dark:bg-warm-900 text-amber-600 dark:text-amber-400 shadow-xs'
                : 'text-warm-500 hover:text-warm-900 dark:text-warm-400'
            }`}
          >
            Paper
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-warm-200 dark:bg-warm-800 h-2 rounded-full overflow-hidden">
        <div
          className="bg-amber-500 h-full transition-all duration-300"
          style={{ width: `${((dailySessionIndex + 1) / dailySessionWords.length) * 100}%` }}
        />
      </div>

      {/* Main Virtual Proctor Interactive Card */}
      <div className="bg-white dark:bg-warm-900 rounded-3xl p-6 sm:p-8 border border-warm-200 dark:border-warm-800 shadow-sm space-y-6">
        {/* Virtual Proctor Controls */}
        <ProctorVoiceControls word={currentWord} autoSpeakOnMount={true} />

        {/* Mode A: Pen & Paper (Contest Replication) */}
        {inputMode === 'paper' && (
          <div className="pt-4 border-t border-warm-100 dark:border-warm-800 space-y-6 text-center">
            <div className="p-4 rounded-2xl bg-warm-50 dark:bg-warm-850 border border-dashed border-warm-300 dark:border-warm-700 max-w-md mx-auto">
              <span className="text-xs font-semibold text-warm-500 dark:text-warm-400 block mb-1">
                Contest Simulation (Pen & Paper)
              </span>
              <p className="text-sm text-warm-700 dark:text-warm-300">
                Listen to the proctor and write the word on your paper.
              </p>
              <span className="inline-block mt-2 text-xs font-mono font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 px-2.5 py-0.5 rounded-full">
                Letter count: {currentWord.length} letters
              </span>
            </div>

            {/* Hidden vs Revealed */}
            {!isPaperRevealed ? (
              <div className="space-y-4">
                <button
                  onClick={() => setIsPaperRevealed(true)}
                  className="px-8 py-4 rounded-2xl bg-warm-900 hover:bg-warm-800 dark:bg-warm-100 dark:hover:bg-white text-white dark:text-warm-900 font-bold text-base shadow-md transition-all active:scale-95 inline-flex items-center gap-2"
                >
                  <Eye className="w-5 h-5 text-amber-500" />
                  <span>Reveal Official Spelling</span>
                  <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-xs font-mono bg-warm-700 dark:bg-warm-300 text-warm-200 dark:text-warm-800 rounded">
                    Enter
                  </kbd>
                </button>
              </div>
            ) : (
              <div className="space-y-6 animate-fadeIn">
                <div className="p-6 rounded-3xl bg-warm-50 dark:bg-warm-850 border border-warm-200 dark:border-warm-750">
                  <span className="text-xs uppercase font-bold tracking-wider text-warm-500 dark:text-warm-400 block mb-2">
                    Official Spelling
                  </span>
                  <div className="text-4xl sm:text-5xl font-black font-mono tracking-wider text-warm-950 dark:text-warm-50">
                    {currentWord}
                  </div>
                </div>

                {/* Self Report Actions */}
                {!hasEvaluated ? (
                  <div className="space-y-2">
                    <span className="text-xs font-semibold text-warm-600 dark:text-warm-300 block">
                      Did your paper match the official spelling?
                    </span>
                    <div className="flex items-center justify-center gap-4">
                      <button
                        onClick={() => handlePaperReport(true)}
                        className="flex-1 max-w-[200px] py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition-transform active:scale-95 flex items-center justify-center gap-2"
                      >
                        <CheckCircle2 className="w-5 h-5" />
                        <span>Got It (1)</span>
                      </button>
                      <button
                        onClick={() => handlePaperReport(false)}
                        className="flex-1 max-w-[200px] py-3.5 px-4 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm shadow-md transition-transform active:scale-95 flex items-center justify-center gap-2"
                      >
                        <XCircle className="w-5 h-5" />
                        <span>Missed It (2)</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div
                      className={`p-4 rounded-2xl font-semibold text-sm inline-flex items-center gap-2 ${
                        lastSubmittedResult
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      }`}
                    >
                      {lastSubmittedResult ? (
                        <>
                          <CheckCircle2 className="w-5 h-5" />
                          <span>Logged: Correct! Streak updated ({currentRecord?.consecutiveStreak} / 3).</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-5 h-5" />
                          <span>Logged: Missed. Added to your Missed Words Vault for review.</span>
                        </>
                      )}
                    </div>
                    <div>
                      <button
                        onClick={handleNextWord}
                        className="px-8 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm shadow-md transition-all inline-flex items-center gap-2"
                      >
                        <span>Next Word</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Mode B: Interactive Typing */}
        {inputMode === 'typing' && (
          <div className="pt-4 border-t border-warm-100 dark:border-warm-800 space-y-6">
            <form onSubmit={handleTypingSubmit} className="space-y-4">
              <div className="relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={typedInput}
                  onChange={(e) => setTypedInput(e.target.value)}
                  disabled={hasEvaluated}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck="false"
                  placeholder="Type the spelling here..."
                  className="w-full text-center py-4 px-6 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 font-mono text-2xl sm:text-3xl font-bold tracking-widest focus:outline-none focus:ring-4 focus:ring-amber-500/20 focus:border-amber-500 transition-all shadow-inner"
                />
              </div>

              {!hasEvaluated && (
                <div className="flex justify-center">
                  <button
                    type="submit"
                    disabled={!typedInput.trim()}
                    className="px-8 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold text-sm shadow-md transition-all inline-flex items-center gap-2"
                  >
                    <span>Check Spelling</span>
                    <kbd className="px-1.5 py-0.5 text-xs font-mono bg-amber-700 text-amber-100 rounded">
                      Enter
                    </kbd>
                  </button>
                </div>
              )}
            </form>

            {/* Evaluated Result & Character Diff */}
            {hasEvaluated && (
              <div className="space-y-4 animate-fadeIn">
                <DiffViewer userInput={typedInput} expectedWord={currentWord} />

                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    onClick={handleNextWord}
                    className="px-8 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm shadow-md transition-all inline-flex items-center gap-2"
                  >
                    <span>Next Word</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Navigation */}
      <div className="flex items-center justify-between text-xs text-warm-500 dark:text-warm-400">
        <button
          onClick={previousDailyWord}
          disabled={dailySessionIndex === 0}
          className="inline-flex items-center gap-1 hover:text-warm-800 dark:hover:text-warm-200 disabled:opacity-40"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Previous</span>
        </button>
        <button
          onClick={endDailySession}
          className="hover:text-rose-600 dark:hover:text-rose-400 font-medium"
        >
          Exit Practice Batch
        </button>
      </div>
    </div>
  );
};

