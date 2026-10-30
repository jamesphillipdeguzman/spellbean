import React, { useState } from 'react';
import {
  AlertTriangle,
  Play,
  Search,
  Filter,
  Volume2,
  CheckCircle,
  Clock,
  Sparkles,
  ArrowUpDown,
  BookOpen,
} from 'lucide-react';
import { useSpellingStore } from '../store/useSpellingStore';
import { WordRecord } from '../types';
import { audioService } from '../services/audio';
import { WordModal } from './WordModal';

export const MissedVault: React.FC = () => {
  const store = useSpellingStore();
  const { words, startDailySession, settings } = store;

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWordForModal, setSelectedWordForModal] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'misses' | 'recent' | 'alpha'>('misses');

  // Filter words that have at least one miss and are not yet mastered
  const missedList: WordRecord[] = Object.values(words).filter(
    (w) => w.incorrectCount > 0 && w.status !== 'mastered'
  );

  const filteredList = missedList.filter((w) =>
    w.word.toLowerCase().includes(searchTerm.trim().toLowerCase())
  );

  filteredList.sort((a, b) => {
    if (sortBy === 'misses') {
      return b.incorrectCount - a.incorrectCount;
    } else if (sortBy === 'recent') {
      const timeA = a.lastAttempted ? new Date(a.lastAttempted).getTime() : 0;
      const timeB = b.lastAttempted ? new Date(b.lastAttempted).getTime() : 0;
      return timeB - timeA;
    } else {
      return a.word.localeCompare(b.word);
    }
  });

  const handlePronounce = (word: string, e: React.MouseEvent) => {
    e.stopPropagation();
    audioService.pronounceWordOfficialCadence(word, {
      rate: settings.speechRate,
      pitch: settings.speechPitch,
      volume: settings.speechVolume,
      voiceURI: settings.selectedVoiceURI,
    });
  };

  const handleStartMissedDrill = () => {
    startDailySession(Math.min(30, Math.max(10, filteredList.length)));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn pb-16">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-rose-500 via-rose-600 to-amber-600 rounded-3xl p-6 sm:p-8 text-white shadow-lg shadow-rose-500/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-rose-100 text-xs font-semibold">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Targeted Reinforcement</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold font-serif text-white">
            Missed Words Vault
          </h1>
          <p className="text-rose-100 text-sm max-w-xl leading-relaxed">
            Every mistake is a learning step. Practice and drill these words until you achieve 3 consecutive error-free recalls to achieve permanent mastery.
          </p>
        </div>

        {missedList.length > 0 && (
          <button
            onClick={handleStartMissedDrill}
            className="w-full md:w-auto px-6 py-4 rounded-2xl bg-white text-rose-700 hover:bg-rose-50 font-bold text-base shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2 shrink-0"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>Drill Missed Words Only ({missedList.length})</span>
          </button>
        )}
      </div>

      {/* Control bar: Search & Sort */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white dark:bg-warm-900 p-4 rounded-2xl border border-warm-200 dark:border-warm-800 shadow-sm">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-warm-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search missed words..."
            className="w-full pl-10 pr-4 py-2 text-sm bg-warm-50 dark:bg-warm-850 border border-warm-200 dark:border-warm-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-warm-900 dark:text-warm-100"
          />
        </div>

        <div className="flex items-center gap-2">
          <ArrowUpDown className="w-4 h-4 text-warm-400 shrink-0" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 text-xs font-semibold bg-warm-50 dark:bg-warm-850 border border-warm-200 dark:border-warm-700 rounded-xl text-warm-700 dark:text-warm-200 focus:outline-none"
          >
            <option value="misses">Sort by Most Missed</option>
            <option value="recent">Sort by Recently Attempted</option>
            <option value="alpha">Sort Alphabetically (A-Z)</option>
          </select>
        </div>
      </div>

      {/* Empty State */}
      {filteredList.length === 0 ? (
        <div className="bg-white dark:bg-warm-900 rounded-3xl p-12 text-center border border-warm-200 dark:border-warm-800 space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold font-serif text-warm-900 dark:text-warm-50">
            {searchTerm ? 'No matching missed words found' : 'Missed Words Vault is Empty!'}
          </h3>
          <p className="text-xs sm:text-sm text-warm-500 dark:text-warm-400 max-w-md mx-auto">
            {searchTerm
              ? 'Try adjusting your search filter.'
              : 'Great job! You currently have zero unresolved errors. Run a Daily Practice session or Mock Bee to test your knowledge.'}
          </p>
        </div>
      ) : (
        /* Missed Words Card Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {filteredList.map((record) => {
            const accuracy = record.attempts > 0 ? Math.round((record.correctCount / record.attempts) * 100) : 0;

            return (
              <div
                key={record.id}
                onClick={() => setSelectedWordForModal(record.word)}
                className="group bg-white dark:bg-warm-900 p-5 rounded-2xl border border-warm-200 dark:border-warm-800 hover:border-amber-400 dark:hover:border-amber-600 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-serif font-bold text-lg text-warm-900 dark:text-warm-50 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                      {record.word}
                    </span>
                    <button
                      onClick={(e) => handlePronounce(record.word, e)}
                      className="p-1.5 rounded-lg text-warm-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950 transition-colors"
                      title="Listen"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>

                  {record.userNotes && (
                    <p className="text-xs text-warm-500 dark:text-warm-400 italic line-clamp-1">
                      "{record.userNotes}"
                    </p>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-warm-100 dark:border-warm-800 flex items-center justify-between text-xs">
                  <span className="inline-flex items-center gap-1 font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950 px-2 py-0.5 rounded-md">
                    <AlertTriangle className="w-3 h-3" />
                    {record.incorrectCount} {record.incorrectCount === 1 ? 'Miss' : 'Misses'}
                  </span>
                  <span className="text-warm-500 dark:text-warm-400 font-mono">
                    Streak: {record.consecutiveStreak}/3
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Word Detail Modal */}
      {selectedWordForModal && (
        <WordModal
          word={selectedWordForModal}
          isOpen={!!selectedWordForModal}
          onClose={() => setSelectedWordForModal(null)}
        />
      )}
    </div>
  );
};

