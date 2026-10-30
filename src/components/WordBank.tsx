import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Filter,
  Star,
  CheckCircle2,
  Clock,
  Volume2,
  BookOpen,
  ArrowUpDown,
  Play,
  Upload,
  PlusCircle,
} from 'lucide-react';
import { useSpellingStore } from '../store/useSpellingStore';
import { useLicenseStore } from '../store/licenseStore';
import { getActiveWords, TOTAL_OFFICIAL_WORDS, FREE_TIER_WORD_LIMIT } from '../services/wordService';
import { WordRecord } from '../types';
import { WordModal } from './WordModal';
import { ImportWordsModal } from './ImportWordsModal';
import { UnlockProModal } from './UnlockProModal';
import { audioService } from '../services/audio';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export const WordBank: React.FC = () => {
  const store = useSpellingStore();
  const { words, wordList, settings, startDailySession } = store;
  const isPro = useLicenseStore((s) => s.isProUnlocked);
  const [showUnlockModal, setShowUnlockModal] = useState(false);

  const activeWordList = useMemo(() => getActiveWords(isPro), [isPro]);
  const activeKeys = useMemo(
    () => new Set(activeWordList.map((w) => w.toLowerCase())),
    [activeWordList]
  );

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'unseen' | 'learning' | 'mastered' | 'starred'>('all');
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'alpha-asc' | 'alpha-desc' | 'attempts-desc' | 'accuracy-desc'>('alpha-asc');
  const [selectedWordForModal, setSelectedWordForModal] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);

  // Filter & Sort calculation - restricted to active words
  const filteredWords = useMemo(() => {
    let result = Object.values(words).filter((w) => activeKeys.has(w.id));

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
  }, [words, activeKeys, selectedStatus, selectedLetter, searchTerm, sortBy]);

  // Pagination State & Slicing Logic (200 words per page)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const WORDS_PER_PAGE = 200;

  // Reset to page 1 whenever search query, letter filter, or status filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedStatus, selectedLetter, sortBy]);

  // Calculate slice range
  const totalItems = filteredWords.length;
  const totalPages = Math.ceil(totalItems / WORDS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * WORDS_PER_PAGE;
  const endIndex = Math.min(startIndex + WORDS_PER_PAGE, totalItems);
  const currentBatchWords = filteredWords.slice(startIndex, endIndex);

  const handlePronounce = (word: string, e: React.MouseEvent) => {
    e.stopPropagation();
    audioService.pronounceWordOfficialCadence(word, {
      rate: settings.speechRate,
      pitch: settings.speechPitch,
      volume: settings.speechVolume,
      voiceURI: settings.selectedVoiceURI,
    });
  };

  const allRecords = useMemo(
    () => Object.values(words).filter((w) => activeKeys.has(w.id)),
    [words, activeKeys]
  );
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
              {isPro
                ? '1,604-word competition study list referenced from the 2026 Student Convention Guidelines.'
                : '100-word free preview sample (of 1,604) referenced from the 2026 Student Convention Guidelines.'}
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
              {masteredCount} of {activeWordList.length} Mastered ({activeWordList.length > 0 ? Math.round((masteredCount / activeWordList.length) * 100) : 0}%)
            </span>
          </div>
        </div>

        {/* Mastered Progress Bar */}
        <div className="w-full bg-warm-100 dark:bg-warm-800 h-2.5 rounded-full overflow-hidden flex">
          <div
            className="bg-emerald-500 h-full"
            style={{ width: `${activeWordList.length > 0 ? (masteredCount / activeWordList.length) * 100 : 0}%` }}
            title={`Mastered: ${masteredCount}`}
          />
          <div
            className="bg-amber-500 h-full"
            style={{ width: `${activeWordList.length > 0 ? (learningCount / activeWordList.length) * 100 : 0}%` }}
            title={`Learning: ${learningCount}`}
          />
          <div
            className="bg-warm-300 dark:bg-warm-700 h-full"
            style={{ width: `${activeWordList.length > 0 ? (unseenCount / activeWordList.length) * 100 : 0}%` }}
            title={`Unseen: ${unseenCount}`}
          />
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="space-y-4 bg-white dark:bg-warm-900 p-4 sm:p-5 rounded-3xl border border-warm-200 dark:border-warm-800 shadow-sm">
        {/* Status Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'all', label: `All (${activeWordList.length})` },
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs sm:text-sm text-slate-500 dark:text-slate-400 px-2 gap-1">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Showing {totalItems === 0 ? 0 : `${startIndex + 1}–${endIndex}`} of {totalItems} words
          {!isPro && ` (${TOTAL_OFFICIAL_WORDS} Total in SOTP Syllabus)`}
          {totalPages > 1 && ` (Page ${currentPage} of ${totalPages})`}
        </p>
        {selectedLetter && (
          <span className="text-xs">
            Filtered by letter: <strong>{selectedLetter}</strong>
          </span>
        )}
      </div>

      {/* Word Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {currentBatchWords.map((record) => {
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

      {/* Pagination Controls UI */}
      {totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-center gap-2 mt-8 pt-6 border-t border-slate-200 dark:border-slate-800">
          {/* Previous Button */}
          <button
            onClick={() => {
              setCurrentPage((prev) => Math.max(prev - 1, 1));
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            disabled={currentPage === 1}
            className="px-3.5 py-2 text-sm font-medium rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
          >
            &larr; Prev
          </button>

          {/* Page Number Buttons */}
          <div className="flex items-center gap-1.5">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => {
                  setCurrentPage(page);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`w-9 h-9 flex items-center justify-center rounded-xl text-sm font-semibold transition cursor-pointer ${
                  currentPage === page
                    ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
                    : 'bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                {page}
              </button>
            ))}
          </div>

          {/* Next Button */}
          <button
            onClick={() => {
              setCurrentPage((prev) => Math.min(prev + 1, totalPages));
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            disabled={currentPage === totalPages}
            className="px-3.5 py-2 text-sm font-medium rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
          >
            Next &rarr;
          </button>
        </div>
      )}

      {/* Free Tier Gating Banner */}
      {!isPro && (
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left mt-4 shadow-lg">
          <div>
            <div className="font-bold text-white text-sm">Unlock the Remaining 1,504 Competition Words</div>
            <div className="text-xs text-slate-400 mt-0.5">Get complete access to the entire SOTP 2026 Student Convention spelling syllabus.</div>
          </div>
          <button
            onClick={() => setShowUnlockModal(true)}
            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white font-bold text-xs rounded-xl transition-all shadow-md shrink-0 cursor-pointer"
          >
            Unlock Lifetime Pro (₱399)
          </button>
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

      {/* Custom Word Ingestion Hub Modal */}
      <ImportWordsModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
      />

      {/* Unlock Pro Modal */}
      <UnlockProModal
        isOpen={showUnlockModal}
        onClose={() => setShowUnlockModal(false)}
        reason="Unlock all 1,604 competition words from the 2026 Student Convention spelling syllabus."
      />
    </div>
  );
};

