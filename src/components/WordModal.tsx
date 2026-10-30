import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Volume2,
  X,
  Play,
  RotateCcw,
  Award,
  AlertTriangle,
  Loader2,
  Sliders,
  CheckCircle2,
  StopCircle,
} from 'lucide-react';
import { WordRecord, WordDefinition } from '../types';
import { useSpellingStore } from '../store/useSpellingStore';
import { useLicenseStore } from '../store/licenseStore';
import { fetchWordDefinition } from '../services/dictionary';
import { audioService, isNeuralVoice } from '../services/audio';
import { UnlockProModal } from './UnlockProModal';

export const CADENCE_CONFIG = {
  slow: {
    letterIntervalMs: 650,
    letterRate: 0.9,
    wordRate: 0.95,
    finalPauseMs: 400,
    transitionDuration: 'duration-300',
  },
  normal: {
    letterIntervalMs: 500,
    letterRate: 1.0,
    wordRate: 1.0,
    finalPauseMs: 350,
    transitionDuration: 'duration-200',
  },
  fast: {
    // Halved speed from previous (increased from 220ms to 400ms) for clean articulation
    letterIntervalMs: 400,
    letterRate: 1.15,
    wordRate: 1.0,
    finalPauseMs: 300,
    transitionDuration: 'duration-150',
  },
};

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
  const isProUnlocked = useLicenseStore((s) => s.isProUnlocked);
  const selectedProctorVoice = settings.selectedVoiceURI;

  // Pro gate modal
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [unlockReason, setUnlockReason] = useState<string | undefined>(undefined);

  // Normalize target word string
  const activeWordString = (selectedWordProp?.word || wordProp || '').trim();
  const wordKey = activeWordString.toLowerCase();
  const record: WordRecord | undefined = words[wordKey];

  const [definition, setDefinition] = useState<WordDefinition | null>(null);
  const [loading, setLoading] = useState(false);

  // Animated letter-by-letter spelling states
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);
  const [isSpellingActive, setIsSpellingActive] = useState(false);
  const [speedMode, setSpeedMode] = useState<'slow' | 'normal' | 'fast'>('slow');
  const isPlayingRef = useRef(false);

  // Cancel reference to cleanly abort timeouts/intervals on close or stop
  const cancelDrillRef = useRef<(() => void) | null>(null);

  // Keep browser speech voices loaded and available
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
      const onVoicesChanged = () => {
        window.speechSynthesis.getVoices();
      };
      window.speechSynthesis.addEventListener('voiceschanged', onVoicesChanged);
      return () => {
        window.speechSynthesis.removeEventListener('voiceschanged', onVoicesChanged);
      };
    }
  }, []);

  const resolveActiveVoice = (): SpeechSynthesisVoice | null => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return null;

    // 1. If Pro is active, match the specific neural voice or localized proctor
    if (isProUnlocked && selectedProctorVoice) {
      const match = voices.find(
        (v) =>
          v.name.toLowerCase().includes(selectedProctorVoice.toLowerCase()) ||
          v.voiceURI.toLowerCase().includes(selectedProctorVoice.toLowerCase())
      );
      if (match) return match;

      // Tagalog / Philippine English fallback match
      if (
        selectedProctorVoice.includes('PH') ||
        selectedProctorVoice.toLowerCase().includes('james') ||
        selectedProctorVoice.toLowerCase().includes('rosa')
      ) {
        const phMatch = voices.find(
          (v) => v.lang.startsWith('en-PH') || v.lang.startsWith('fil') || v.lang.startsWith('tl')
        );
        if (phMatch) return phMatch;
      }

      if (selectedProctorVoice.toLowerCase().includes('jenny')) {
        const jennyMatch = voices.find(
          (v) => v.name.toLowerCase().includes('jenny') || v.lang.startsWith('en-US')
        );
        if (jennyMatch) return jennyMatch;
      }
    } else if (selectedProctorVoice) {
      const match = voices.find(
        (v) =>
          v.name.toLowerCase().includes(selectedProctorVoice.toLowerCase()) ||
          v.voiceURI.toLowerCase().includes(selectedProctorVoice.toLowerCase())
      );
      if (match) return match;
    }

    // 2. Fallback to preferred English natural voice rather than raw system default
    return (
      voices.find(
        (v) =>
          v.lang.startsWith('en') &&
          (v.name.includes('Natural') || v.name.includes('Neural') || v.name.includes('Online'))
      ) ||
      voices.find((v) => v.lang.startsWith('en-US')) ||
      voices[0] ||
      null
    );
  };

  const stopSpellingDrill = () => {
    isPlayingRef.current = false;
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
   * Interactive Synchronized "Spell It Out" Drill
   * 1. Skips saying full word upfront - jumps straight into synchronized spelling.
   * 2. Sequentially highlights active letter card and articulates letter.
   * 3. Clears letter highlight and applies cadence pause before closing resolution.
   * 4. Pronounces complete word at natural rate (smooth, unclipped, zero hoarseness).
   */
  const handleStartSpellingDrill = async () => {
    if (isSpellingActive) {
      stopSpellingDrill();
      return;
    }

    stopSpellingDrill();
    isPlayingRef.current = true;
    setIsSpellingActive(true);
    setHighlightedIndex(null);

    const config = CADENCE_CONFIG[speedMode];
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    audioService.stop();

    const activeVoice = resolveActiveVoice();
    const lettersUpper = displayWord.toUpperCase().split('');

    try {
      for (let i = 0; i < lettersUpper.length; i++) {
        if (!isPlayingRef.current) break; // Allow instant cancellation via "Stop Spelling"

        // 1. Immediately highlight the active letter card
        setHighlightedIndex(i);

        // 2. Wait for letterUtterance.onend before incrementing index so cards never jump ahead of audio
        await new Promise<void>((resolve) => {
          if (!isPlayingRef.current) {
            resolve();
            return;
          }

          let isResolved = false;
          const startTime = Date.now();

          const onUtteranceEnd = () => {
            if (isResolved) return;
            if (!isPlayingRef.current) {
              isResolved = true;
              resolve();
              return;
            }

            // Ensure letter card stays highlighted for at least letterIntervalMs
            const elapsed = Date.now() - startTime;
            const remaining = Math.max(0, config.letterIntervalMs - elapsed);

            if (remaining > 0) {
              const timer = setTimeout(() => {
                isResolved = true;
                resolve();
              }, remaining);

              cancelDrillRef.current = () => {
                clearTimeout(timer);
                isResolved = true;
                resolve();
              };
            } else {
              isResolved = true;
              resolve();
            }
          };

          const letterUtterance = new SpeechSynthesisUtterance(lettersUpper[i]);
          if (activeVoice) {
            letterUtterance.voice = activeVoice;
            letterUtterance.lang = activeVoice.lang;
          }
          letterUtterance.rate = config.letterRate;
          letterUtterance.pitch = 1.0;

          // Advance ONLY when utterance actually finishes
          letterUtterance.onend = onUtteranceEnd;
          letterUtterance.onerror = onUtteranceEnd;

          try {
            window.speechSynthesis.speak(letterUtterance);
          } catch {
            onUtteranceEnd();
          }

          // Safety watchdog only if speech engine stalls without firing onend
          const watchdog = setTimeout(onUtteranceEnd, Math.max(2500, config.letterIntervalMs * 4));

          const prevCancel = cancelDrillRef.current;
          cancelDrillRef.current = () => {
            clearTimeout(watchdog);
            if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
              window.speechSynthesis.cancel();
            }
            if (prevCancel) prevCancel();
            isResolved = true;
            resolve();
          };
        });
      }

      if (!isPlayingRef.current) return;

      // 3. Clear letter highlight and pause slightly before the final word
      setHighlightedIndex(null);
      await new Promise<void>((resolve) => {
        const pauseTimer = setTimeout(resolve, config.finalPauseMs);
        cancelDrillRef.current = () => {
          clearTimeout(pauseTimer);
          resolve();
        };
      });

      if (!isPlayingRef.current) return;

      // 4. Pronounce the complete word with natural pitch and volume (no hoarseness)
      await new Promise<void>((resolve) => {
        if (!isPlayingRef.current) {
          resolve();
          return;
        }

        const finalWordUtterance = new SpeechSynthesisUtterance(displayWord);
        if (activeVoice) {
          finalWordUtterance.voice = activeVoice;
          finalWordUtterance.lang = activeVoice.lang;
        }
        finalWordUtterance.rate = config.wordRate; // Natural baseline rate so it sounds smooth
        finalWordUtterance.pitch = 1.0;

        finalWordUtterance.onend = () => {
          setIsSpellingActive(false);
          setHighlightedIndex(null);
          isPlayingRef.current = false;
          resolve();
        };
        finalWordUtterance.onerror = () => {
          setIsSpellingActive(false);
          setHighlightedIndex(null);
          isPlayingRef.current = false;
          resolve();
        };

        try {
          window.speechSynthesis.speak(finalWordUtterance);
        } catch {
          setIsSpellingActive(false);
          setHighlightedIndex(null);
          isPlayingRef.current = false;
          resolve();
        }

        cancelDrillRef.current = () => {
          if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            window.speechSynthesis.cancel();
          }
          resolve();
        };
      });
    } catch (err) {
      console.warn('Spelling drill ended or interrupted:', err);
    } finally {
      if (isPlayingRef.current) {
        setIsSpellingActive(false);
        setHighlightedIndex(null);
        isPlayingRef.current = false;
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
              <img 
                src="/lightbulb-flash-line.svg" 
                alt="Lightbulb" 
                className="w-4 h-4 text-amber-500 inline-block align-middle brightness-125" 
              />
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
                  className={`w-11 h-13 sm:w-12 sm:h-14 flex items-center justify-center font-bold text-lg sm:text-xl rounded-2xl border transition-all transform ${
                    isCurrent
                      ? 'bg-amber-500 border-amber-400 text-white shadow-lg shadow-amber-500/30 scale-110 z-10'
                      : 'bg-slate-100 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                  } ${CADENCE_CONFIG[speedMode].transitionDuration}`}
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
                  onClick={() => setSpeedMode('slow')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                    speedMode === 'slow'
                      ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  Slow
                </button>
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
                  onClick={() => {
                    if (!isProUnlocked) {
                      setUnlockReason(
                        "Rapid 'Blitz' spelling drill (400ms/letter) is an exclusive Spellbean Pro training feature."
                      );
                      setShowUnlockModal(true);
                      return;
                    }
                    setSpeedMode('fast');
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                    speedMode === 'fast'
                      ? 'bg-amber-500 text-white shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <span>Fast</span>
                  {!isProUnlocked && (
                    <span className="text-[10px] bg-amber-500/20 text-amber-600 dark:text-amber-300 px-1 rounded font-bold">
                      PRO
                    </span>
                  )}
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

        {/* Pro Unlock Modal */}
        <UnlockProModal
          isOpen={showUnlockModal}
          onClose={() => setShowUnlockModal(false)}
          reason={unlockReason}
        />
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default WordModal;
