import React, { useState, useEffect } from 'react';
import { Volume2, X } from 'lucide-react';
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

  // Normalize target word string
  const activeWordString = (selectedWordProp?.word || wordProp || '').trim();
  const wordKey = activeWordString.toLowerCase();
  const record: WordRecord | undefined = words[wordKey];

  const [definition, setDefinition] = useState<WordDefinition | null>(null);
  const [loading, setLoading] = useState(false);

  // Close modal on ESC key
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

  // Fetch definition and pronunciation data
  useEffect(() => {
    if (!isOpen || !activeWordString) return;
    setLoading(true);

    fetchWordDefinition(activeWordString).then((def) => {
      setDefinition(def);
      setLoading(false);
    });
  }, [activeWordString, isOpen]);

  // Guard against undefined / modal closed
  if (!isOpen || !activeWordString) return null;

  // Unified word object with null safety
  const selectedWord = {
    word: record?.word || selectedWordProp?.word || activeWordString,
    streak: record ? record.consecutiveStreak : selectedWordProp?.streak || 0,
    status: record?.status || (selectedWordProp?.streak >= 3 ? 'mastered' : 'unseen'),
    partOfSpeech: definition?.partOfSpeech || selectedWordProp?.partOfSpeech || 'Noun/Term',
    phonetic: definition?.phonetic || selectedWordProp?.phonetic,
    definition: definition?.definition || selectedWordProp?.definition,
    example: definition?.exampleSentence || selectedWordProp?.example,
  };

  const playAudio = (wordToSpeak?: string) => {
    if (!wordToSpeak) return;
    audioService.speakText(wordToSpeak, {
      rate: settings.speechRate,
      pitch: settings.speechPitch,
      volume: settings.speechVolume,
      voiceURI: settings.selectedVoiceURI,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-warm-900 p-6 shadow-2xl border border-slate-100 dark:border-warm-800 animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-2xl font-bold capitalize text-slate-900 dark:text-slate-50 font-serif">
              {selectedWord.word}
            </h3>
            <p className="text-xs text-amber-700 dark:text-amber-400 font-medium mt-0.5">
              {selectedWord.partOfSpeech || 'Noun/Term'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-warm-800 hover:text-slate-700 dark:hover:text-slate-200 transition"
            title="Close (Esc)"
          >
            ✕
          </button>
        </div>

        {/* Audio & Pronunciation */}
        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={() => playAudio(selectedWord.word)}
            className="flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-amber-600 transition active:scale-95"
          >
            <span>🔊</span> Hear Word
          </button>
          {selectedWord.phonetic && (
            <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
              [{selectedWord.phonetic}]
            </span>
          )}
        </div>

        {/* Definition & Examples */}
        <div className="mt-4 space-y-3 rounded-xl bg-slate-50 dark:bg-warm-850 p-4 border border-slate-100 dark:border-warm-800">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Definition
            </span>
            <p className="text-sm text-slate-700 dark:text-slate-300 mt-1 leading-relaxed">
              {selectedWord.definition || 'No definition available in offline cache.'}
            </p>
          </div>
          {selectedWord.example && (
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Example
              </span>
              <p className="text-sm italic text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                "{selectedWord.example}"
              </p>
            </div>
          )}
        </div>

        {/* Mastery Stats */}
        <div className="mt-5 flex items-center justify-between border-t border-slate-100 dark:border-warm-800 pt-4 text-xs text-slate-500 dark:text-slate-400">
          <span>
            Consecutive Streak:{' '}
            <strong className="text-slate-800 dark:text-slate-200">
              {selectedWord.streak || 0} / 3
            </strong>
          </span>
          <span
            className={`px-2 py-0.5 rounded-full font-medium ${
              selectedWord.streak >= 3
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                : 'bg-slate-100 dark:bg-warm-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            {selectedWord.streak >= 3 ? 'Mastered' : 'Unmastered'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default WordModal;
