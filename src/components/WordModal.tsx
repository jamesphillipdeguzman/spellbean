import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Volume2,
  X,
  Play,
  RotateCcw,
  Sparkles,
  Award,
  AlertTriangle,
  Loader2,
  Sliders,
  CheckCircle2,
  StopCircle,
} from 'lucide-react';
import { WordRecord, WordDefinition } from '../types';
import { useSpellingStore } from '../store/useSpellingStore';
import { fetchWordDefinition } from '../services/dictionary';
import { audioService } from '../services/audio';

export interface WordModalProps {
  word?: string | null;
  selectedWord?: any;
  isOpen: boolean;
  onClose: () => void;
}

export const WordModal: React.FC<WordModalProps> = ({
  word: wordProp,
  selectedWord: selectedWordProp,
  isOpen,
  onClose,
}) => {
  const words = useSpellingStore((s) => s.words);
  const settings = useSpellingStore((s) => s.settings);
  const toggleMissedVaultWord = useSpellingStore((s) => s.toggleMissedVaultWord);

  // Normalize target word string
  const activeWordString = (selectedWordProp?.word || wordProp || '').trim();
  const wordKey = activeWordString.toLowerCase();
  const record: WordRecord | undefined = words[wordKey];

  const [definition, setDefinition] = useState<WordDefinition | null>(null);
  const [loading, setLoading] = useState(false);

  // Animated letter-by-letter spelling states
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);
  const [isSpellingActive, setIsSpellingActive] = useState(false);
  const [speedMode, setSpeedMode] = useState<'normal' | 'slow'>('slow');

  // Cancel reference to cleanly abort timeouts/intervals on close or stop
  const cancelDrillRef = useRef<(() => void) | null>(null);

  const stopSpellingDrill = () => {
    if (cancelDrillRef.current) {
      cancelDrillRef.current();
      cancelDrillRef.current = null;
    }
    audioService.stop();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpellingActive(false);
    setHighlightedIndex(null);
  };

  // Close modal on ESC key and cleanup on unmount
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        stopSpellingDrill();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      stopSpellingDrill();
    };
  }, [isOpen, onClose]);

  // Fetch definition & context
  useEffect(() => {
    if (!isOpen || !activeWordString) return;
    setLoading(true);
    stopSpellingDrill();

    fetchWordDefinition(activeWordString).then((def) => {
      setDefinition(def);
      setLoading(false);
    });
  }, [activeWordString, isOpen]);

  // Guard against undefined / modal closed / SSR
  if (!isOpen || !activeWordString || typeof document === 'undefined') {
    return null;
  }

  // Unified word object with null safety
  const displayWord = record?.word || selectedWordProp?.word || activeWordString;
  const streak = record ? record.consecutiveStreak : selectedWordProp?.streak || 0;
  const isMastered = streak >= 3 || record?.status === 'mastered';
  const isInVault = record ? record.incorrectCount > 0 && record.status !== 'mastered' : false;
  const partOfSpeech = definition?.partOfSpeech || selectedWordProp?.partOfSpeech || 'Noun/Term';
  const phonetic = definition?.phonetic || selectedWordProp?.phonetic;
  const defText = definition?.definition || selectedWordProp?.definition;
  const exampleText = definition?.exampleSentence || selectedWordProp?.example;

  const letters: string[] = (displayWord || '').split('');

  const playWordAudio = () => {
    stopSpellingDrill();
    audioService.speakText(displayWord, {
      rate: settings.speechRate,
      pitch: settings.speechPitch,
      volume: settings.speechVolume,
      voiceURI: settings.selectedVoiceURI || 'en-PH-JamesNeural',
    });
  };

  const playOfficialCadence = () => {
    stopSpellingDrill();
    audioService.pronounceWordOfficialCadence(displayWord, {
      rate: settings.speechRate,
      pitch: settings.speechPitch,
      volume: settings.speechVolume,
      voiceURI: settings.selectedVoiceURI || 'en-PH-JamesNeural',
      pauseDurationSeconds: settings.pauseBetweenWordsSeconds,
    });
  };

  /**
   * Interactive Automated "Spell It Out" Drill
   * 1. Skip saying the full word at the start - jumps straight into spelling the letters.
   * 2. Sequentially highlight each letter tile and await audio playback.
   * 3. Once the final letter is spoken, wait a clean pause (approx. 600ms).
   * 4. Pronounce the full word at the very end as the closing resolution.
   */
  const handleStartSpellingDrill = async () => {
    if (isSpellingActive) {
      stopSpellingDrill();
      return;
    }

    // Explicitly cancel any pending speech synthesis
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    audioService.stop();

    setIsSpellingActive(true);
    setHighlightedIndex(null);

    let isAborted = false;
    let sleepTimer: any = null;
    let sleepResolve: (() => void) | null = null;

    cancelDrillRef.current = () => {
      isAborted = true;
      if (sleepTimer) {
        clearTimeout(sleepTimer);
        sleepTimer = null;
      }
      if (sleepResolve) {
        sleepResolve();
        sleepResolve = null;
      }
      audioService.stop();
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };

    const cancellableDelay = (ms: number): Promise<void> => {
      return new Promise((resolve) => {
        if (isAborted) {
          resolve();
          return;
        }
        sleepResolve = resolve;
        sleepTimer = setTimeout(() => {
          sleepTimer = null;
          sleepResolve = null;
          resolve();
        }, ms);
      });
    };

    // Ensure effective active voice is resolved and verified
    const activeVoice = settings.selectedVoiceURI || 'en-PH-JamesNeural';
    // Deliberate cadence for spellers:
    // "slow" mode (default): rate 0.85, 300ms clean gap between letters for natural pacing without overlap
    // "normal" mode: rate 1.0, 150ms gap
    const letterRate = speedMode === 'slow' ? 0.85 : 1.0;
    const postLetterPause = speedMode === 'slow' ? 300 : 150;

    try {
      // Step 1: Jump straight into spelling letters sequentially (no initial whole word)
      for (let i = 0; i < letters.length; i++) {
        if (isAborted) break;

        const letter = letters[i];
        setHighlightedIndex(i);

        // Await audio playback completion (audio load & play event) for 100% tile sync
        await audioService.speakTextAsync(`${letter.toUpperCase()}.`, {
          rate: letterRate,
          pitch: settings.speechPitch,
          volume: settings.speechVolume,
          voiceURI: activeVoice,
        });

        if (isAborted) break;

        // Clean pause between letter tiles without overlapping speech clips
        if (i < letters.length - 1) {
          await cancellableDelay(postLetterPause);
        }
      }

      if (isAborted) return;

      // Step 2: Clean pause (approx. 600ms) after final letter
      setHighlightedIndex(null);
      await cancellableDelay(600);

      if (isAborted) return;

      // Step 3: Pronounce full word at the very end as closing resolution
      await audioService.speakTextAsync(displayWord, {
        rate: settings.speechRate,
        pitch: settings.speechPitch,
        volume: settings.speechVolume,
        voiceURI: activeVoice,
      });
    } catch (err) {
      console.warn('Spelling drill ended or interrupted:', err);
    } finally {
      if (!isAborted) {
        setIsSpellingActive(false);
        setHighlightedIndex(null);
      }
    }
  };

  const handleToggleVault = () => {
    toggleMissedVaultWord(activeWordString);
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto animate-fadeIn"
      onClick={() => {
        stopSpellingDrill();
        onClose();
      }}
    >
      <div
        className="relative z-[101] w-full max-w-lg rounded-3xl bg-white dark:bg-warm-900 p-6 shadow-2xl border border-amber-100 dark:border-warm-800 animate-in fade-in zoom-in-95 duration-200 space-y-6 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Card Header */}
        <div className="flex items-start justify-between border-b border-warm-100 dark:border-warm-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-2xl sm:text-3xl font-extrabold capitalize text-slate-900 dark:text-slate-50 font-serif">
                {displayWord}
              </h3>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 capitalize">
                {partOfSpeech}
              </span>
            </div>
            {phonetic && (
              <p className="font-mono text-xs text-slate-500 dark:text-slate-400 mt-1">
                [{phonetic}]
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={playWordAudio}
              className="p-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white shadow-sm transition active:scale-95"
              title="Hear Word"
            >
              <Volume2 className="w-5 h-5" />
            </button>
            <button
              onClick={() => {
                stopSpellingDrill();
                onClose();
              }}
              className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-warm-800 hover:text-slate-700 dark:hover:text-slate-200 transition"
              title="Close (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Interactive Animated Letter-by-Letter Spelling Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-warm-500 dark:text-warm-400 font-semibold uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Letter-by-Letter Breakdown
            </span>
            <span className="font-mono lowercase text-[11px] font-normal">
              {letters.length} letters
            </span>
          </div>

          {/* Letter Tiles Row */}
          <div className="flex flex-wrap justify-center gap-2 my-4">
            {letters.map((char: string, idx: number) => {
              const isCurrent = highlightedIndex === idx;
              return (
                <div
                  key={idx}
                  className={`w-10 h-12 rounded-xl flex items-center justify-center text-xl font-bold font-mono transition-all duration-300 ${
                    isCurrent
                      ? 'bg-amber-500 text-white border-amber-500 scale-110 shadow-lg ring-4 ring-amber-300 dark:ring-amber-800 animate-pulse border-2'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 shadow-2xs hover:border-amber-400'
                  }`}
                >
                  {char.toUpperCase()}
                </div>
              );
            })}
          </div>

          {/* Spell It Out Drill Actions */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={handleStartSpellingDrill}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm active:scale-95 ${
                isSpellingActive
                  ? 'bg-rose-500 hover:bg-rose-600 text-white animate-pulse'
                  : 'bg-amber-500 hover:bg-amber-600 text-white'
              }`}
            >
              {isSpellingActive ? (
                <>
                  <StopCircle className="w-4 h-4" />
                  <span>Stop Spelling</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>Spell Out Letter by Letter</span>
                </>
              )}
            </button>

            {/* Speed Toggle & Replay */}
            <div className="flex items-center gap-1 text-xs">
              <div className="flex items-center p-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                <button
                  onClick={() => setSpeedMode('normal')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                    speedMode === 'normal'
                      ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  Normal
                </button>
                <button
                  onClick={() => setSpeedMode('slow')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                    speedMode === 'slow'
                      ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  Slow
                </button>
              </div>

              <button
                onClick={playOfficialCadence}
                className="p-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
                title="Hear Official 2x Cadence"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Study Details Card: Definition & Example */}
        <div className="space-y-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 p-4 border border-slate-200 dark:border-slate-700 text-xs">
          <div>
            <span className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-amber-400 font-bold block mb-1">
              DEFINITION
            </span>
            {loading ? (
              <div className="flex items-center gap-2 py-1 text-amber-600 dark:text-amber-400">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Loading definition...</span>
              </div>
            ) : (
              <p className="text-sm font-serif leading-relaxed text-slate-800 dark:text-slate-200">
                {defText || 'Competition word in the official study bank.'}
              </p>
            )}
          </div>

          {exampleText && (
            <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
              <span className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-amber-400 font-bold block mb-1">
                SENTENCE IN CONTEXT
              </span>
              <p className="text-xs text-slate-700 dark:text-slate-300 italic leading-relaxed font-serif">
                "{exampleText}"
              </p>
            </div>
          )}
        </div>

        {/* Mastery Tracker & Missed Vault Action */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-slate-100 dark:border-warm-800 pt-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 dark:text-slate-400">
              Consecutive Streak:{' '}
              <strong className="text-slate-800 dark:text-slate-100 font-bold font-mono">
                {streak} / 3
              </strong>
            </span>
            <span
              className={`px-2.5 py-0.5 rounded-full font-bold uppercase text-[10px] tracking-wider ${
                isMastered
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                  : 'bg-warm-100 dark:bg-warm-800 text-warm-600 dark:text-warm-400'
              }`}
            >
              {isMastered ? 'Mastered' : 'Unmastered'}
            </span>
          </div>

          {/* Toggle Add / Remove from Missed Words Vault */}
          <button
            onClick={handleToggleVault}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-2xs ${
              isInVault
                ? 'bg-rose-100 hover:bg-rose-200 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                : 'bg-warm-100 hover:bg-amber-100 text-warm-700 dark:bg-warm-800 dark:text-warm-300 dark:hover:bg-amber-950 hover:text-amber-800 border border-warm-200 dark:border-warm-700'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            <span>{isInVault ? 'Remove from Missed Vault' : 'Add to Missed Vault'}</span>
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default WordModal;
