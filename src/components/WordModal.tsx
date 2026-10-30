import React, { useState, useEffect } from 'react';
import { X, Volume2, Star, CheckCircle, Clock, Award, BookOpen, AlertTriangle, Edit3 } from 'lucide-react';
import { WordRecord, WordDefinition } from '../types';
import { useSpellingStore } from '../store/useSpellingStore';
import { fetchWordDefinition } from '../services/dictionary';
import { audioService } from '../services/audio';

interface WordModalProps {
  word: string;
  isOpen: boolean;
  onClose: () => void;
}

export const WordModal: React.FC<WordModalProps> = ({ word, isOpen, onClose }) => {
  const words = useSpellingStore((s) => s.words);
  const settings = useSpellingStore((s) => s.settings);
  const updateWordNotes = useSpellingStore((s) => s.updateWordNotes);
  const toggleStarWord = useSpellingStore((s) => s.toggleStarWord);
  const overrideWordStatus = useSpellingStore((s) => s.overrideWordStatus);

  const record: WordRecord | undefined = words[word.toLowerCase()];
  const [definition, setDefinition] = useState<WordDefinition | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState(record?.userNotes || '');
  const [showMaskedSentence, setShowMaskedSentence] = useState(false);

  useEffect(() => {
    if (!isOpen || !word) return;
    setLoading(true);
    setNotes(record?.userNotes || '');

    fetchWordDefinition(word).then((def) => {
      setDefinition(def);
      setLoading(false);
    });
  }, [word, isOpen, record?.userNotes]);

  if (!isOpen || !record) return null;

  const handleSaveNotes = () => {
    updateWordNotes(word, notes);
  };

  const handlePronounce = (cadence = false) => {
    if (cadence) {
      audioService.pronounceWordOfficialCadence(word, {
        rate: settings.speechRate,
        pitch: settings.speechPitch,
        volume: settings.speechVolume,
        voiceURI: settings.selectedVoiceURI,
      });
    } else {
      audioService.speakText(word, {
        rate: settings.speechRate,
        pitch: settings.speechPitch,
        volume: settings.speechVolume,
        voiceURI: settings.selectedVoiceURI,
      });
    }
  };

  const accuracy = record.attempts > 0 ? Math.round((record.correctCount / record.attempts) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div
        className="w-full max-w-xl bg-white dark:bg-warm-900 rounded-3xl shadow-2xl border border-warm-200 dark:border-warm-800 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-warm-50 via-warm-100 to-warm-50 dark:from-warm-900 dark:via-warm-850 dark:to-warm-900 border-b border-warm-200 dark:border-warm-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => toggleStarWord(word)}
              className={`p-1.5 rounded-xl transition-colors ${
                record.starred
                  ? 'text-amber-500 bg-amber-100 dark:bg-amber-950'
                  : 'text-warm-400 hover:text-amber-500 hover:bg-warm-200 dark:hover:bg-warm-800'
              }`}
              title={record.starred ? 'Starred word' : 'Star word for review'}
            >
              <Star className="w-5 h-5 fill-current" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-2xl font-bold font-serif tracking-tight text-warm-900 dark:text-warm-50">
                  {record.word}
                </h3>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-semibold capitalize ${
                    record.status === 'mastered'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : record.status === 'learning'
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      : 'bg-warm-200 text-warm-700 dark:bg-warm-800 dark:text-warm-300'
                  }`}
                >
                  {record.status}
                </span>
              </div>
              <span className="text-xs text-warm-500 dark:text-warm-400 font-mono">
                {definition?.phonetic || `/${word}/`} {definition?.partOfSpeech ? `• ${definition.partOfSpeech}` : ''}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePronounce(true)}
              className="p-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white shadow-sm transition-transform active:scale-95"
              title="Pronounce (Official 2x)"
            >
              <Volume2 className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-warm-400 hover:text-warm-600 dark:hover:text-warm-200 hover:bg-warm-100 dark:hover:bg-warm-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm text-warm-800 dark:text-warm-200">
          {/* Definition block */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-warm-500 dark:text-warm-400 uppercase tracking-wider flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-amber-500" />
              Definition & Context
            </span>
            <div className="p-4 rounded-2xl bg-warm-50 dark:bg-warm-850 border border-warm-200 dark:border-warm-800 space-y-3">
              <p className="font-serif leading-relaxed text-base text-warm-900 dark:text-warm-100">
                {definition?.definition || 'Loading definition from SOT word bank...'}
              </p>
              {definition?.exampleSentence && (
                <div className="pt-2 border-t border-warm-200 dark:border-warm-750">
                  <span className="text-xs text-warm-500 dark:text-warm-400 block mb-1">Example:</span>
                  <p className="italic text-warm-700 dark:text-warm-300">
                    "{definition.exampleSentence}"
                  </p>
                </div>
              )}
              {definition?.origin && (
                <div className="pt-2 text-xs text-warm-500 dark:text-warm-400">
                  <span className="font-semibold text-warm-600 dark:text-warm-300">Origin: </span>
                  {definition.origin}
                </div>
              )}
            </div>
          </div>

          {/* Performance Stats */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-warm-500 dark:text-warm-400 uppercase tracking-wider">
              Student Performance History
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-warm-50 dark:bg-warm-850 border border-warm-200 dark:border-warm-800 text-center">
                <span className="text-xs text-warm-500 dark:text-warm-400 block">Total Attempts</span>
                <span className="text-lg font-bold text-warm-900 dark:text-warm-100">{record.attempts}</span>
              </div>
              <div className="p-3 rounded-xl bg-warm-50 dark:bg-warm-850 border border-warm-200 dark:border-warm-800 text-center">
                <span className="text-xs text-emerald-600 dark:text-emerald-400 block">Accuracy</span>
                <span className="text-lg font-bold text-emerald-700 dark:text-emerald-300">{accuracy}%</span>
              </div>
              <div className="p-3 rounded-xl bg-warm-50 dark:bg-warm-850 border border-warm-200 dark:border-warm-800 text-center">
                <span className="text-xs text-amber-600 dark:text-amber-400 block">Consecutive Streak</span>
                <span className="text-lg font-bold text-amber-700 dark:text-amber-300">{record.consecutiveStreak} / 3</span>
              </div>
              <div className="p-3 rounded-xl bg-warm-50 dark:bg-warm-850 border border-warm-200 dark:border-warm-800 text-center">
                <span className="text-xs text-rose-600 dark:text-rose-400 block">Missed Count</span>
                <span className="text-lg font-bold text-rose-700 dark:text-rose-300">{record.incorrectCount}</span>
              </div>
            </div>
          </div>

          {/* User Mnemonic & Study Notes */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-warm-500 dark:text-warm-400 uppercase tracking-wider flex items-center gap-1.5">
              <Edit3 className="w-4 h-4 text-amber-500" />
              Mnemonic & Speller's Notes
            </span>
            <div className="relative">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={handleSaveNotes}
                placeholder="E.g., Notice double 'c' and double 's', silent letters, Latin root..."
                rows={2}
                className="w-full p-3 rounded-2xl bg-warm-50 dark:bg-warm-850 border border-warm-200 dark:border-warm-700 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm placeholder:text-warm-400"
              />
              <span className="text-[11px] text-warm-400 absolute right-3 bottom-2">
                Auto-saves on blur
              </span>
            </div>
          </div>

          {/* Manual Status Override */}
          <div className="pt-2 border-t border-warm-200 dark:border-warm-800 flex items-center justify-between">
            <span className="text-xs font-medium text-warm-500 dark:text-warm-400">
              Manual Status Override:
            </span>
            <div className="flex items-center gap-1.5">
              {(['unseen', 'learning', 'mastered'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => overrideWordStatus(word, st)}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold capitalize transition-colors ${
                    record.status === st
                      ? 'bg-warm-800 text-white dark:bg-warm-100 dark:text-warm-900 shadow-sm'
                      : 'bg-warm-100 dark:bg-warm-800 text-warm-600 dark:text-warm-300 hover:bg-warm-200'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

