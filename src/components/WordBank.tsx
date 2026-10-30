import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Star,
  CheckCircle2,
  Clock,
  Sparkles,
  Volume2,
  BookOpen,
  ArrowUpDown,
  Play,
  Upload,
  PlusCircle,
} from 'lucide-react';
import { useSpellingStore } from '../store/useSpellingStore';
import { WordRecord } from '../types';
import { WordModal } from './WordModal';
import { ImportWordsModal } from './ImportWordsModal';
import { audioService } from '../services/audio';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export const WordBank: React.FC = () => {
  const store = useSpellingStore();
  const { words, wordList, settings, startDailySession } = store;

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'unseen' | 'learning' | 'mastered' | 'starred'>('all');
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'alpha-asc' | 'alpha-desc' | 'attempts-desc' | 'accuracy-desc'>('alpha-asc');
  const [selectedWordForModal, setSelectedWordForModal] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);

  // Filter & Sort calculation
  const filteredWords = useMemo(() => {
    let result = Object.values(words);

    // Filter by status / starred
    if (selectedStatus === 'unseen') {
      result = result.filter((w) => w.status === 'unseen');
    } else if (selectedStatus === 'learning') {
      result = result.filter((w) => w.status === 'learning');
    } else if (selectedStatus === 'mastered') {
      result = result.filter((w) => w.status === 'mastered');
    } else if (selectedStatus === 'starred') {
      result = result.filter((w) => w.starred);
    }

    // Filter by initial letter
    if (selectedLetter) {
      result = result.filter((w) => w.word.toUpperCase().startsWith(selectedLetter));
    }

    // Filter by search term
    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      result = result.filter((w) => w.word.toLowerCase().includes(q) || (w.userNotes && w.userNotes.toLowerCase().includes(q)));
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'alpha-asc') return a.word.localeCompare(b.word);
      if (sortBy === 'alpha-desc') return b.word.localeCompare(a.word);
      if (sortBy === 'attempts-desc') return b.attempts - a.attempts;
      if (sortBy === 'accuracy-desc') {
        const accA = a.attempts > 0 ? a.correctCount / a.attempts : 0;
        const accB = b.attempts > 0 ? b.correctCount / b.attempts : 0;
        return accB - accA;
      }
      return 0;
    });

    return result;
  }, [words, selectedStatus, selectedLetter, searchTerm, sortBy]);

  const handlePronounce = (word: string, e: React.MouseEvent) => {
    e.stopPropagation();
    audioService.pronounceWordOfficialCadence(word, {
      rate: settings.speechRate,
      pitch: settings.speechPitch,
      volume: settings.speechVolume,
      voiceURI: settings.selectedVoiceURI,
    });
  };

  const allRecords = Object.values(words);
  const masteredCount = allRecords.filter((w) => w.status === 'mastered').length;
  const learningCount = allRecords.filter((w) => w.status === 'learning').length;
  const unseenCount = allRecords.filter((w) => w.status === 'unseen').length;

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fadeIn pb-16">
      {/* Header Overview Card */}
      <div className="bg-white dark:bg-warm-900 rounded-3xl p-6 sm:p-8 border border-warm-200 dark:border-warm-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
                <BookOpen className="w-5 h-5" />
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold font-serif text-warm-900 dark:text-warm-50">
                Word Bank Explorer
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-warm-500 dark:text-warm-400 mt-1">
              1,604-word study list referenced from the 2026 Student Convention Guidelines.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowImportModal(true)}
              className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-sm transition-all flex items-center gap-1.5 active:scale-95"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import Words (CSV/Excel/PDF)</span>
            </button>
            <span className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
              {masteredCount} of {wordList.length} Mastered ({wordList.length > 0 ? Math.round((masteredCount / wordList.length) * 100) : 0}%)
            </span>
          </div>
        </div>

        {/* Mastered Progress Bar */}
        <div className="w-full bg-warm-100 dark:bg-warm-800 h-2.5 rounded-full overflow-hidden flex">
          <div
            className="bg-emerald-500 h-full"
            style={{ width: `${(masteredCount / 1604) * 100}%` }}
            title={`Mastered: ${masteredCount}`}
          />
          <div
            className="bg-amber-500 h-full"
            style={{ width: `${(learningCount / 1604) * 100}%` }}
            title={`Learning: ${learningCount}`}
          />
          <div
            className="bg-warm-300 dark:bg-warm-700 h-full"
            style={{ width: `${(unseenCount / 1604) * 100}%` }}
            title={`Unseen: ${unseenCount}`}
          />
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="space-y-4 bg-white dark:bg-warm-900 p-4 sm:p-5 rounded-3xl border border-warm-200 dark:border-warm-800 shadow-sm">
        {/* Status Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'all', label: `All (${wordList.length})` },
            { id: 'unseen', label: `Unseen (${unseenCount})` },
            { id: 'learning', label: `Learning (${learningCount})` },
            { id: 'mastered', label: `Mastered (${masteredCount})` },
            { id: 'starred', label: `Starred` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedStatus(tab.id as any)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                selectedStatus === tab.id
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'bg-warm-100 dark:bg-warm-800 text-warm-700 dark:text-warm-300 hover:bg-warm-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input & Sort Dropdown */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by spelling or notes..."
              className="w-full pl-10 pr-4 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full sm:w-auto px-3 py-2 text-xs font-semibold bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100" value="alpha-asc">Alphabetical (A → Z)</option>
              <option className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100" value="alpha-desc">Alphabetical (Z → A)</option>
              <option className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100" value="attempts-desc">Most Attempted</option>
              <option className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100" value="accuracy-desc">Highest Accuracy</option>
            </select>
          </div>
        </div>

        {/* Alphabet Jump Bar */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 pt-2 border-t border-warm-100 dark:border-warm-800 no-scrollbar">
          <button
            onClick={() => setSelectedLetter(null)}
            className={`px-2.5 py-1 text-xs font-bold rounded-lg shrink-0 transition-colors ${
              selectedLetter === null
                ? 'bg-amber-500 text-white'
                : 'text-warm-500 hover:text-warm-900 dark:text-warm-400'
            }`}
          >
            All
          </button>
          {ALPHABET.map((letter) => (
            <button
              key={letter}
              onClick={() => setSelectedLetter(selectedLetter === letter ? null : letter)}
              className={`w-7 h-7 flex items-center justify-center text-xs font-bold rounded-lg shrink-0 transition-colors ${
                selectedLetter === letter
                  ? 'bg-amber-500 text-white'
                  : 'text-warm-600 dark:text-warm-300 hover:bg-warm-100 dark:hover:bg-warm-800'
              }`}
            >
              {letter}
            </button>
          ))}
        </div>
      </div>

      {/* Words Count & Results Info */}
      <div className="flex items-center justify-between text-xs text-warm-500 dark:text-warm-400 px-2">
        <span>Showing {filteredWords.length} words</span>
        {selectedLetter && (
          <span>
            Filtered by letter: <strong>{selectedLetter}</strong>
          </span>
        )}
      </div>

      {/* Word Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {filteredWords.map((record) => {
          return (
            <div
              key={record.id}
              onClick={() => setSelectedWordForModal(record.word)}
              className="group p-3.5 rounded-2xl bg-white dark:bg-warm-900 border border-warm-200 dark:border-warm-800 hover:border-amber-400 dark:hover:border-amber-600 shadow-2xs hover:shadow-sm transition-all cursor-pointer flex flex-col justify-between"
            >
              <div className="flex items-start justify-between gap-1">
                <span className="font-serif font-bold text-sm sm:text-base text-warm-900 dark:text-warm-100 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors truncate">
                  {record.word}
                </span>
                <button
                  onClick={(e) => handlePronounce(record.word, e)}
                  className="p-1 text-warm-400 hover:text-amber-600 rounded shrink-0"
                  title="Pronounce"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="mt-3 flex items-center justify-between text-[11px]">
                <span
                  className={`px-1.5 py-0.5 rounded-md font-semibold capitalize ${
                    record.status === 'mastered'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : record.status === 'learning'
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      : 'bg-warm-100 text-warm-600 dark:bg-warm-800 dark:text-warm-400'
                  }`}
                >
                  {record.status}
                </span>

                <span className="text-warm-400 font-mono">
                  {record.attempts > 0 ? `${record.consecutiveStreak}/3` : '0 att'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Word Detail Modal */}
      {selectedWordForModal && (
        <WordModal
          word={selectedWordForModal}
          isOpen={!!selectedWordForModal}
          onClose={() => setSelectedWordForModal(null)}
        />
      )}

      {/* Custom Word Ingestion Hub Modal */}
      <ImportWordsModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
      />
    </div>
  );
};

