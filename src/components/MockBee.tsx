import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  Trophy,
  Award,
  Clock,
  Play,
  RotateCcw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowRight,
  ShieldAlert,
  Send,
  Download,
  HelpCircle,
  Eye,
  FileCheck,
} from 'lucide-react';
import { useSpellingStore } from '../store/useSpellingStore';
import { ProctorVoiceControls } from './ProctorVoiceControls';
import { DiffViewer } from './DiffViewer';
import { audioService } from '../services/audio';
import { MockBeeResult, MockBeeAnswer } from '../types';

export const MockBee: React.FC = () => {
  const store = useSpellingStore();
  const {
    mockBeeActive,
    mockBeeWords,
    mockBeeIndex,
    mockBeeAnswers,
    mockBeeConfig,
    lastMockBeeResult,
    settings,
    startMockBee,
    submitMockBeeAnswer,
    finishMockBee,
    clearMockBee,
    sendMockBeeErrorsToVault,
    setActiveTab,
  } = store;

  // Setup form states
  const [selectedCount, setSelectedCount] = useState<25 | 50 | 100>(25);
  const [includePractice, setIncludePractice] = useState(true);
  const [selectedInputMode, setSelectedInputMode] = useState<'typing' | 'paper'>('typing');

  // Exam runtime states
  const [currentInput, setCurrentInput] = useState('');
  const [wordStartTime, setWordStartTime] = useState<number>(Date.now());
  const [sentErrorsNotice, setSentErrorsNotice] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentWord = mockBeeWords[mockBeeIndex] || '';
  const isPracticeWord = includePractice && mockBeeIndex < 2;

  // Reset input and timer on word change
  useEffect(() => {
    setCurrentInput('');
    setWordStartTime(Date.now());
    if (mockBeeActive && selectedInputMode === 'typing') {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [mockBeeIndex, mockBeeActive, selectedInputMode]);

  // When mock bee completes and shows scorecard, trigger celebratory effects if score is good
  useEffect(() => {
    if (lastMockBeeResult && !mockBeeActive) {
      if (lastMockBeeResult.scorePercentage >= 80) {
        try {
          confetti({
            particleCount: 100,
            spread: 80,
            origin: { y: 0.6 },
            colors: ['#F59E0B', '#10B981', '#3B82F6'],
          });
        } catch (e) {}
      }
    }
  }, [lastMockBeeResult, mockBeeActive]);

  const handleStartExam = () => {
    startMockBee({
      wordCount: selectedCount,
      includePracticeWords: includePractice,
      inputMode: selectedInputMode,
    });
  };

  const handleSubmitWord = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const duration = Date.now() - wordStartTime;
    submitMockBeeAnswer(currentInput, duration);
  };

  const handleSendErrorsToVault = (result: MockBeeResult) => {
    sendMockBeeErrorsToVault(result);
    setSentErrorsNotice(true);
  };

  // 1. SETUP / LAUNCH SCREEN (if no exam is running and no result to view)
  if (!mockBeeActive && !lastMockBeeResult) {
    return (
      <div className="max-w-3xl mx-auto space-y-8 animate-fadeIn">
        {/* Banner */}
        <div className="bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-amber-500/10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-amber-100 text-xs font-semibold mb-3">
            <Trophy className="w-3.5 h-3.5" />
            <span>Convention Guidelines (2026 Edition)</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold font-serif tracking-tight text-white mb-2">
            Contest Simulation (Mock Bee)
          </h1>
          <p className="text-amber-100 text-sm max-w-xl leading-relaxed">
            Experience realistic preparation for the Student Convention spelling competition. Per convention guidelines, words are pronounced twice with definitions, but feedback is strictly deferred until the round concludes.
          </p>
        </div>

        {/* Configuration Card */}
        <div className="bg-white dark:bg-warm-900 rounded-3xl p-6 sm:p-8 border border-warm-200 dark:border-warm-800 shadow-sm space-y-6">
          <h2 className="text-xl font-bold text-warm-900 dark:text-warm-50">
            Contest Parameters
          </h2>

          {/* Test length */}
          <div className="space-y-3">
            <label className="text-xs font-semibold text-warm-600 dark:text-warm-300 uppercase tracking-wider block">
              Round Length:
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[25, 50, 100].map((len) => (
                <button
                  key={len}
                  onClick={() => setSelectedCount(len as 25 | 50 | 100)}
                  className={`p-4 rounded-2xl border text-center transition-all ${
                    selectedCount === len
                      ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 shadow-sm ring-2 ring-amber-500/20'
                      : 'border-warm-200 dark:border-warm-800 hover:bg-warm-50 dark:hover:bg-warm-850 text-warm-700 dark:text-warm-300'
                  }`}
                >
                  <div className="text-2xl font-black">{len}</div>
                  <div className="text-xs text-warm-500 dark:text-warm-400 mt-0.5">
                    {len === 25 ? 'Standard Round' : len === 50 ? 'Regional Finals' : 'National Bee'}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Practice Words Toggle */}
          <div className="p-4 rounded-2xl bg-warm-50 dark:bg-warm-850 border border-warm-200 dark:border-warm-800 flex items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="font-semibold text-sm text-warm-900 dark:text-warm-100 flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                2 Unscored Practice Words
              </span>
              <p className="text-xs text-warm-500 dark:text-warm-400">
                Convention Guidelines: Judges provide two warm-up practice words before competitive scoring begins.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={includePractice}
                onChange={(e) => setIncludePractice(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-warm-300 peer-focus:outline-none rounded-full peer dark:bg-warm-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-warm-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
            </label>
          </div>

          {/* Mode Selection */}
          <div className="space-y-3">
            <label className="text-xs font-semibold text-warm-600 dark:text-warm-300 uppercase tracking-wider block">
              Contestant Input Format:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => setSelectedInputMode('typing')}
                className={`p-4 rounded-2xl border text-left transition-all ${
                  selectedInputMode === 'typing'
                    ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 ring-2 ring-amber-500/20'
                    : 'border-warm-200 dark:border-warm-800 text-warm-700 dark:text-warm-300'
                }`}
              >
                <div className="font-bold text-sm">Mode B: Digital Typing</div>
                <div className="text-xs text-warm-500 dark:text-warm-400 mt-1">
                  Type directly on screen. Typos and score remain concealed until round completion.
                </div>
              </button>
              <button
                onClick={() => setSelectedInputMode('paper')}
                className={`p-4 rounded-2xl border text-left transition-all ${
                  selectedInputMode === 'paper'
                    ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 ring-2 ring-amber-500/20'
                    : 'border-warm-200 dark:border-warm-800 text-warm-700 dark:text-warm-300'
                }`}
              >
                <div className="font-bold text-sm">Mode A: Pen & Paper (True Replica)</div>
                <div className="text-xs text-warm-500 dark:text-warm-400 mt-1">
                  Write answers on real paper. Check off your sheet against the master key at the end.
                </div>
              </button>
            </div>
          </div>

          {/* Start CTA */}
          <button
            onClick={handleStartExam}
            className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-lg shadow-lg shadow-amber-500/25 transition-all flex items-center justify-center gap-3 active:scale-[0.99]"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>
              Start Simulated Contest Round ({selectedCount} Words
              {includePractice ? ' + 2 Practice' : ''})
            </span>
          </button>
        </div>
      </div>
    );
  }

  // 2. ACTIVE EXAM SCREEN (DEFERRED FEEDBACK)
  if (mockBeeActive) {
    const totalCount = mockBeeWords.length;
    const currentNum = mockBeeIndex + 1;

    return (
      <div className="max-w-3xl mx-auto space-y-6 animate-fadeIn pb-12">
        {/* Exam Header */}
        <div className="flex items-center justify-between gap-4 bg-white dark:bg-warm-900 px-5 py-3.5 rounded-2xl border border-warm-200 dark:border-warm-800 shadow-sm">
          <div className="flex items-center gap-2">
            <span
              className={`text-xs font-bold px-3 py-1 rounded-xl uppercase tracking-wider ${
                isPracticeWord
                  ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                  : 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
              }`}
            >
              {isPracticeWord ? 'Practice Word (Unscored)' : `Word ${currentNum} of ${totalCount}`}
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-warm-500 dark:text-warm-400">
            <Clock className="w-4 h-4 text-amber-500" />
            <span>Simulated Contest Round</span>
          </div>
        </div>

        {/* Deferred Feedback Alert Banner */}
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-amber-500/10 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 text-xs sm:text-sm">
          <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <span>
            <strong className="font-semibold text-amber-950 dark:text-amber-300">Convention Guidelines:</strong> Feedback and spelling corrections are strictly deferred until you turn in your exam sheet at the end.
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-warm-200 dark:bg-warm-800 h-2 rounded-full overflow-hidden">
          <div
            className="bg-amber-500 h-full transition-all duration-300"
            style={{ width: `${(currentNum / totalCount) * 100}%` }}
          />
        </div>

        {/* Main Proctor Interactive Card */}
        <div className="bg-white dark:bg-warm-900 rounded-3xl p-6 sm:p-8 border border-warm-200 dark:border-warm-800 shadow-sm space-y-6">
          <ProctorVoiceControls word={currentWord} autoSpeakOnMount={true} />

          {/* Contestant Answer Input Area */}
          <div className="pt-4 border-t border-warm-100 dark:border-warm-800 space-y-6">
            {selectedInputMode === 'typing' ? (
              <form onSubmit={handleSubmitWord} className="space-y-4">
                <input
                  ref={inputRef}
                  type="text"
                  value={currentInput}
                  onChange={(e) => setCurrentInput(e.target.value)}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck="false"
                  placeholder="Type the spelling here..."
                  className="w-full text-center py-4 px-6 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 font-mono text-2xl font-bold tracking-widest focus:outline-none focus:ring-4 focus:ring-amber-500/20 focus:border-amber-500 transition-all shadow-inner"
                />

                <div className="flex justify-center">
                  <button
                    type="submit"
                    disabled={!currentInput.trim()}
                    className="px-8 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white font-bold text-sm shadow-md transition-all inline-flex items-center gap-2"
                  >
                    <span>
                      {mockBeeIndex === mockBeeWords.length - 1 ? 'Submit & Conclude Exam' : 'Submit & Next Word'}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            ) : (
              <div className="text-center space-y-4">
                <p className="text-sm text-warm-600 dark:text-warm-300">
                  Write the word clearly on line <strong>#{currentNum}</strong> of your contest paper.
                </p>
                <button
                  onClick={() => handleSubmitWord()}
                  className="px-8 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm shadow-md transition-all inline-flex items-center gap-2"
                >
                  <span>Logged on Paper & Next</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Emergency finish button */}
        <div className="flex justify-center">
          <button
            onClick={() => finishMockBee()}
            className="text-xs text-warm-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
          >
            End and Turn In Exam Early
          </button>
        </div>
      </div>
    );
  }

  // 3. END-OF-TEST SCORECARD & REVIEW SCREEN
  const result = lastMockBeeResult!;
  const minutes = Math.floor(result.durationMs / 60000);
  const seconds = Math.floor((result.durationMs % 60000) / 1000);

  // Determine award tier
  let medalTitle = 'First Place Award (Gold)';
  let medalColor = 'text-amber-500 bg-amber-100 dark:bg-amber-950/80';
  if (result.scorePercentage < 70) {
    medalTitle = 'Convention Certificate of Participation';
    medalColor = 'text-warm-600 bg-warm-100 dark:bg-warm-800';
  } else if (result.scorePercentage < 85) {
    medalTitle = 'Third Place Award (Bronze)';
    medalColor = 'text-amber-700 bg-amber-100 dark:bg-amber-950/80';
  } else if (result.scorePercentage < 95) {
    medalTitle = 'Second Place Award (Silver)';
    medalColor = 'text-slate-600 bg-slate-100 dark:bg-slate-800';
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn pb-16">
      {/* Scorecard Hero */}
      <div className="bg-white dark:bg-warm-900 rounded-3xl p-6 sm:p-8 border border-warm-200 dark:border-warm-800 shadow-xl space-y-6 text-center">
        <div className={`w-20 h-20 rounded-3xl ${medalColor} flex items-center justify-center mx-auto shadow-inner`}>
          <Trophy className="w-10 h-10" />
        </div>

        <div className="space-y-1">
          <span className="text-xs uppercase font-bold tracking-wider text-warm-500 dark:text-warm-400">
            Contest Simulation Scorecard
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold font-serif text-warm-900 dark:text-warm-50">
            {medalTitle}
          </h2>
          <p className="text-warm-600 dark:text-warm-300 text-sm">
            Exam completed on {new Date(result.date).toLocaleDateString()} in {minutes}m {seconds}s.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto">
          <div className="p-4 rounded-2xl bg-warm-50 dark:bg-warm-850 border border-warm-200 dark:border-warm-800">
            <span className="text-xs text-warm-500 dark:text-warm-400 block">Final Score</span>
            <span className="text-3xl font-black text-amber-600 dark:text-amber-400">
              {result.scorePercentage}%
            </span>
          </div>
          <div className="p-4 rounded-2xl bg-warm-50 dark:bg-warm-850 border border-warm-200 dark:border-warm-800">
            <span className="text-xs text-emerald-600 dark:text-emerald-400 block">Correct Recalls</span>
            <span className="text-3xl font-black text-emerald-700 dark:text-emerald-300">
              {result.correctCount}
            </span>
          </div>
          <div className="p-4 rounded-2xl bg-warm-50 dark:bg-warm-850 border border-warm-200 dark:border-warm-800">
            <span className="text-xs text-rose-600 dark:text-rose-400 block">Errors</span>
            <span className="text-3xl font-black text-rose-700 dark:text-rose-300">
              {result.incorrectCount}
            </span>
          </div>
          <div className="p-4 rounded-2xl bg-warm-50 dark:bg-warm-850 border border-warm-200 dark:border-warm-800">
            <span className="text-xs text-warm-500 dark:text-warm-400 block">Practice Words</span>
            <span className="text-3xl font-black text-warm-700 dark:text-warm-300">
              {result.practiceCount}
            </span>
          </div>
        </div>

        {/* Error Queue Quick Action */}
        {result.incorrectCount > 0 && (
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 max-w-xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-left">
            <div>
              <span className="font-bold text-sm text-amber-900 dark:text-amber-200 block">
                {result.incorrectCount} Missed Words Detected
              </span>
              <p className="text-xs text-amber-800 dark:text-amber-300">
                Instantly prioritize these errors in your Missed Words Vault for spaced recall.
              </p>
            </div>
            <button
              onClick={() => handleSendErrorsToVault(result)}
              disabled={sentErrorsNotice}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:bg-emerald-600 text-white font-bold text-xs shadow-sm transition-all shrink-0 flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{sentErrorsNotice ? 'Added to Vault!' : 'Send All Errors to Vault'}</span>
            </button>
          </div>
        )}

        {/* Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            onClick={() => handleStartExam()}
            className="px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm shadow-md transition-all flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Retake Another Mock Bee</span>
          </button>
          <button
            onClick={() => clearMockBee()}
            className="px-6 py-3 rounded-2xl bg-warm-100 dark:bg-warm-800 hover:bg-warm-200 text-warm-800 dark:text-warm-100 font-semibold text-sm transition-all"
          >
            Close Scorecard
          </button>
        </div>
      </div>

      {/* Comprehensive Itemized Review with Character Diff */}
      <div className="bg-white dark:bg-warm-900 rounded-3xl p-6 sm:p-8 border border-warm-200 dark:border-warm-800 shadow-sm space-y-6">
        <h3 className="text-xl font-bold text-warm-900 dark:text-warm-50 flex items-center gap-2">
          <Eye className="w-5 h-5 text-amber-500" />
          Itemized Answer Sheet & Typo Breakdown
        </h3>

        <div className="divide-y divide-warm-100 dark:divide-warm-800">
          {result.answers.map((ans, idx) => {
            return (
              <div key={idx} className="py-4 first:pt-0 last:pb-0 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-bold text-warm-400">
                      #{idx + 1}
                    </span>
                    <span className="text-lg font-serif font-bold text-warm-900 dark:text-warm-100">
                      {ans.word}
                    </span>
                    {ans.isPractice && (
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full">
                        Practice
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    {ans.isCorrect ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1 rounded-full">
                        <CheckCircle2 className="w-4 h-4" />
                        Correct
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-3 py-1 rounded-full">
                        <XCircle className="w-4 h-4" />
                        Missed
                      </span>
                    )}
                  </div>
                </div>

                {/* If incorrect and typed, show visual character diff! */}
                {!ans.isCorrect && ans.userInput && (
                  <div className="mt-2 pl-6">
                    <DiffViewer userInput={ans.userInput} expectedWord={ans.word} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

