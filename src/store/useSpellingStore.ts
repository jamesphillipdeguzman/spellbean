import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import officialWordsData from '../data/sotp_spelling_words.json';
import {
  WordRecord,
  InputMode,
  AppSettings,
  MockBeeResult,
  MockBeeAnswer,
} from '../types';

interface SpellingState {
  // Word Bank Data
  words: Record<string, WordRecord>; // keyed by lowercase word
  wordList: string[]; // 1,604 words in canonical order

  // App Settings
  settings: AppSettings;

  // Active Tab
  activeTab: 'daily' | 'mockbee' | 'vault' | 'wordbank' | 'settings';

  // Daily Session State
  dailySessionWords: string[];
  dailySessionIndex: number;
  dailySessionResults: Record<string, boolean>; // word -> correct/incorrect
  isDailySessionActive: boolean;
  dailySessionCompleted: boolean;
  todayCompletedCount: number;
  lastActiveDate: string;
  consecutiveDaysStreak: number;

  // Mock Bee Contest Simulation State
  mockBeeActive: boolean;
  mockBeeWords: string[]; // Practice words (first 2) followed by test words
  mockBeeIndex: number;
  mockBeeAnswers: MockBeeAnswer[];
  mockBeeStartTime: number | null;
  mockBeeResultsHistory: MockBeeResult[];
  lastMockBeeResult: MockBeeResult | null;
  mockBeeConfig: {
    wordCount: 25 | 50 | 100;
    includePracticeWords: boolean;
    inputMode: InputMode;
  };

  // Actions - Word records
  recordAttempt: (word: string, isCorrect: boolean) => void;
  updateWordNotes: (word: string, notes: string) => void;
  toggleStarWord: (word: string) => void;
  overrideWordStatus: (word: string, status: WordRecord['status']) => void;
  toggleMissedVaultWord: (word: string) => void;
  addCustomWords: (newWords: string[]) => { addedCount: number; duplicateCount: number };

  // Actions - Daily Session
  startDailySession: (batchSize?: number) => void;
  submitDailyWord: (word: string, isCorrect: boolean) => void;
  nextDailyWord: () => void;
  previousDailyWord: () => void;
  endDailySession: () => void;

  // Actions - Mock Bee
  startMockBee: (config?: { wordCount?: 25 | 50 | 100; includePracticeWords?: boolean; inputMode?: InputMode }) => void;
  submitMockBeeAnswer: (userInput: string, timeSpentMs?: number) => void;
  finishMockBee: () => MockBeeResult;
  clearMockBee: () => void;
  sendMockBeeErrorsToVault: (result: MockBeeResult) => void;

  // Actions - Settings & Data Management
  setActiveTab: (tab: SpellingState['activeTab']) => void;
  updateSettings: (partial: Partial<AppSettings>) => void;
  exportUserData: () => string;
  importUserData: (jsonData: string) => { success: boolean; message: string };
  resetAllProgress: () => void;
  
  // Computed helpers
  getRemainingDaysUntilTarget: () => number;
  getDailyTargetQuota: () => number;
  getMissedWords: () => WordRecord[];
  getWordsByStatus: (status: WordRecord['status']) => WordRecord[];
}

const DEFAULT_SETTINGS: AppSettings = {
  inputMode: 'typing',
  speechRate: 0.85, // Official cadence rate
  speechPitch: 1.0,
  speechVolume: 1.0,
  selectedVoiceURI: 'en-PH-JamesNeural', // Realistic Neural Philippine English (Default local proctor)
  targetConventionDate: '2027-02-01',
  dailyGoal: 30,
  soundEffects: true,
  autoSpeakOnNewWord: true,
  pauseBetweenWordsSeconds: 2,
  darkMode: false,
  highContrast: false,
};

// Generate initial word records from the 1,604 official word list
function createInitialWordRecords(): Record<string, WordRecord> {
  const records: Record<string, WordRecord> = {};
  const words: string[] = officialWordsData.words || [];

  for (const w of words) {
    const key = w.toLowerCase();
    records[key] = {
      id: key,
      word: w,
      status: 'unseen',
      attempts: 0,
      correctCount: 0,
      incorrectCount: 0,
      consecutiveStreak: 0,
      userNotes: '',
      starred: false,
    };
  }

  return records;
}

export const useSpellingStore = create<SpellingState>()(
  persist(
    (set, get) => ({
      words: createInitialWordRecords(),
      wordList: officialWordsData.words || [],
      settings: DEFAULT_SETTINGS,
      activeTab: 'daily',

      // Daily Session
      dailySessionWords: [],
      dailySessionIndex: 0,
      dailySessionResults: {},
      isDailySessionActive: false,
      dailySessionCompleted: false,
      todayCompletedCount: 0,
      lastActiveDate: '',
      consecutiveDaysStreak: 0,

      // Mock Bee
      mockBeeActive: false,
      mockBeeWords: [],
      mockBeeIndex: 0,
      mockBeeAnswers: [],
      mockBeeStartTime: null,
      mockBeeResultsHistory: [],
      lastMockBeeResult: null,
      mockBeeConfig: {
        wordCount: 25,
        includePracticeWords: true,
        inputMode: 'typing',
      },

      setActiveTab: (tab) => set({ activeTab: tab }),

      updateSettings: (partial) =>
        set((state) => ({
          settings: { ...state.settings, ...partial },
        })),

      getRemainingDaysUntilTarget: () => {
        const targetStr = get().settings.targetConventionDate || '2027-02-01';
        const targetDate = new Date(targetStr + 'T00:00:00');
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const diffMs = targetDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        return Math.max(1, diffDays);
      },

      getDailyTargetQuota: () => {
        const remainingDays = get().getRemainingDaysUntilTarget();
        const words = Object.values(get().words);
        const unmastered = words.filter((w) => w.status !== 'mastered').length;
        const calculated = Math.ceil(unmastered / remainingDays);
        return Math.max(15, Math.min(60, calculated || 30));
      },

      getMissedWords: () => {
        return Object.values(get().words).filter(
          (w) => w.incorrectCount > 0 && w.status !== 'mastered'
        );
      },

      getWordsByStatus: (status) => {
        return Object.values(get().words).filter((w) => w.status === status);
      },

      recordAttempt: (wordRaw: string, isCorrect: boolean) => {
        const key = wordRaw.toLowerCase();
        const state = get();
        const existing = state.words[key] || {
          id: key,
          word: wordRaw,
          status: 'unseen',
          attempts: 0,
          correctCount: 0,
          incorrectCount: 0,
          consecutiveStreak: 0,
        };

        const newAttempts = existing.attempts + 1;
        const newCorrect = isCorrect ? existing.correctCount + 1 : existing.correctCount;
        const newIncorrect = !isCorrect ? existing.incorrectCount + 1 : existing.incorrectCount;
        const newStreak = isCorrect ? existing.consecutiveStreak + 1 : 0;

        // Rule: 3 consecutive correct recalls = 'mastered'
        let newStatus: WordRecord['status'] = existing.status;
        if (newStreak >= 3) {
          newStatus = 'mastered';
        } else if (newAttempts > 0) {
          newStatus = 'learning';
        }

        const todayStr = new Date().toISOString().split('T')[0];
        let newConsecutiveDays = state.consecutiveDaysStreak;
        if (state.lastActiveDate !== todayStr) {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = yesterday.toISOString().split('T')[0];
          if (state.lastActiveDate === yesterdayStr) {
            newConsecutiveDays += 1;
          } else if (!state.lastActiveDate) {
            newConsecutiveDays = 1;
          } else {
            newConsecutiveDays = 1;
          }
        }

        set({
          words: {
            ...state.words,
            [key]: {
              ...existing,
              attempts: newAttempts,
              correctCount: newCorrect,
              incorrectCount: newIncorrect,
              consecutiveStreak: newStreak,
              status: newStatus,
              lastAttempted: new Date().toISOString(),
            },
          },
          todayCompletedCount: state.lastActiveDate === todayStr ? state.todayCompletedCount + 1 : 1,
          lastActiveDate: todayStr,
          consecutiveDaysStreak: newConsecutiveDays,
        });
      },

      updateWordNotes: (wordRaw: string, notes: string) => {
        const key = wordRaw.toLowerCase();
        const existing = get().words[key];
        if (!existing) return;
        set({
          words: {
            ...get().words,
            [key]: { ...existing, userNotes: notes },
          },
        });
      },

      toggleStarWord: (wordRaw: string) => {
        const key = wordRaw.toLowerCase();
        const existing = get().words[key];
        if (!existing) return;
        set({
          words: {
            ...get().words,
            [key]: { ...existing, starred: !existing.starred },
          },
        });
      },

      overrideWordStatus: (wordRaw: string, status: WordRecord['status']) => {
        const key = wordRaw.toLowerCase();
        const existing = get().words[key];
        if (!existing) return;
        set({
          words: {
            ...get().words,
            [key]: {
              ...existing,
              status,
              consecutiveStreak: status === 'mastered' ? Math.max(3, existing.consecutiveStreak) : 0,
            },
          },
        });
      },

      toggleMissedVaultWord: (wordRaw: string) => {
        const key = wordRaw.toLowerCase();
        const existing = get().words[key];
        if (!existing) return;

        const isCurrentlyInVault = existing.incorrectCount > 0 && existing.status !== 'mastered';
        set({
          words: {
            ...get().words,
            [key]: {
              ...existing,
              incorrectCount: isCurrentlyInVault ? 0 : Math.max(1, existing.incorrectCount + 1),
              status: isCurrentlyInVault ? existing.status : 'learning',
            },
          },
        });
      },

      addCustomWords: (newWords: string[]) => {
        const state = get();
        const updatedWords = { ...state.words };
        const updatedWordList = [...state.wordList];
        let addedCount = 0;
        let duplicateCount = 0;

        for (const rawWord of newWords) {
          const trimmed = rawWord.trim();
          if (!trimmed) continue;
          const key = trimmed.toLowerCase();

          if (updatedWords[key]) {
            duplicateCount++;
          } else {
            updatedWords[key] = {
              id: key,
              word: trimmed,
              status: 'unseen',
              attempts: 0,
              correctCount: 0,
              incorrectCount: 0,
              consecutiveStreak: 0,
              userNotes: 'Custom imported word',
              starred: false,
            };
            updatedWordList.push(trimmed);
            addedCount++;
          }
        }

        set({
          words: updatedWords,
          wordList: updatedWordList,
        });

        return { addedCount, duplicateCount };
      },

      startDailySession: (batchSizeOverride?: number) => {
        const state = get();
        const batchSize = batchSizeOverride || state.settings.dailyGoal || 30;
        const missedTargetCount = Math.round(batchSize * 0.3); // 30% from Missed Vault
        const unmasteredTargetCount = batchSize - missedTargetCount; // 70% unmastered/unseen

        // Collect candidates
        const allWords = Object.values(state.words);
        const missedVault = allWords
          .filter((w) => w.incorrectCount > 0 && w.status !== 'mastered')
          .sort((a, b) => b.incorrectCount - a.incorrectCount);

        const unseenWords = allWords.filter((w) => w.status === 'unseen');
        const learningWords = allWords.filter((w) => w.status === 'learning');

        // Shuffle arrays helper
        const shuffle = <T>(arr: T[]): T[] => [...arr].sort(() => Math.random() - 0.5);

        // Pick missed words
        const pickedMissed = shuffle(missedVault).slice(0, missedTargetCount);
        const pickedKeys = new Set(pickedMissed.map((w) => w.id));

        // Pick unmastered/unseen words
        const remainingUnmastered = shuffle([
          ...unseenWords.filter((w) => !pickedKeys.has(w.id)),
          ...learningWords.filter((w) => !pickedKeys.has(w.id)),
        ]);

        const pickedUnmastered = remainingUnmastered.slice(0, unmasteredTargetCount);
        pickedUnmastered.forEach((w) => pickedKeys.add(w.id));

        // If batch is still short, fill with any words not yet picked
        let combined = [...pickedMissed, ...pickedUnmastered];
        if (combined.length < batchSize) {
          const leftovers = shuffle(allWords.filter((w) => !pickedKeys.has(w.id)));
          combined = [...combined, ...leftovers.slice(0, batchSize - combined.length)];
        }

        const sessionWords = shuffle(combined).map((w) => w.word);

        set({
          dailySessionWords: sessionWords,
          dailySessionIndex: 0,
          dailySessionResults: {},
          isDailySessionActive: true,
          dailySessionCompleted: false,
        });
      },

      submitDailyWord: (wordRaw: string, isCorrect: boolean) => {
        const state = get();
        get().recordAttempt(wordRaw, isCorrect);

        const updatedResults = {
          ...state.dailySessionResults,
          [wordRaw.toLowerCase()]: isCorrect,
        };

        const isLastWord = state.dailySessionIndex >= state.dailySessionWords.length - 1;

        set({
          dailySessionResults: updatedResults,
          dailySessionCompleted: isLastWord,
        });
      },

      nextDailyWord: () => {
        const state = get();
        if (state.dailySessionIndex < state.dailySessionWords.length - 1) {
          set({ dailySessionIndex: state.dailySessionIndex + 1 });
        } else {
          set({ dailySessionCompleted: true });
        }
      },

      previousDailyWord: () => {
        const state = get();
        if (state.dailySessionIndex > 0) {
          set({ dailySessionIndex: state.dailySessionIndex - 1 });
        }
      },

      endDailySession: () => {
        set({
          isDailySessionActive: false,
          dailySessionCompleted: false,
          dailySessionWords: [],
          dailySessionIndex: 0,
          dailySessionResults: {},
        });
      },

      // Contest Simulation Mode (Mock Bee)
      startMockBee: (customConfig) => {
        const state = get();
        const config = {
          ...state.mockBeeConfig,
          ...(customConfig || {}),
        };

        const allWords = [...state.wordList];
        const shuffle = <T>(arr: T[]): T[] => [...arr].sort(() => Math.random() - 0.5);
        const shuffled = shuffle(allWords);

        // Official SOT Rule: 2 unscored practice words at the start
        const practiceWords = ['abacus', 'adolescence']; // Two familiar competition standard practice words
        const testWords = shuffled.filter((w) => !practiceWords.includes(w.toLowerCase())).slice(0, config.wordCount);

        const fullMockList = config.includePracticeWords ? [...practiceWords, ...testWords] : testWords;

        set({
          mockBeeConfig: config,
          mockBeeActive: true,
          mockBeeWords: fullMockList,
          mockBeeIndex: 0,
          mockBeeAnswers: [],
          mockBeeStartTime: Date.now(),
          lastMockBeeResult: null,
        });
      },

      submitMockBeeAnswer: (userInput: string, timeSpentMs = 0) => {
        const state = get();
        const currentWord = state.mockBeeWords[state.mockBeeIndex];
        const isPractice = state.mockBeeConfig.includePracticeWords && state.mockBeeIndex < 2;
        const isCorrect = userInput.trim().toLowerCase() === currentWord.trim().toLowerCase();

        // Record attempt in user's permanent records if it is a scored test word
        if (!isPractice) {
          get().recordAttempt(currentWord, isCorrect);
        }

        const answer: MockBeeAnswer = {
          word: currentWord,
          isPractice,
          userInput: userInput.trim(),
          isCorrect,
          timeSpentMs,
          revealedAt: new Date().toISOString(),
        };

        const updatedAnswers = [...state.mockBeeAnswers, answer];

        if (state.mockBeeIndex < state.mockBeeWords.length - 1) {
          set({
            mockBeeAnswers: updatedAnswers,
            mockBeeIndex: state.mockBeeIndex + 1,
          });
        } else {
          // Finished! Build result
          const scoredAnswers = updatedAnswers.filter((a) => !a.isPractice);
          const correctScored = scoredAnswers.filter((a) => a.isCorrect).length;
          const scorePercentage = scoredAnswers.length > 0 ? Math.round((correctScored / scoredAnswers.length) * 100) : 100;
          const totalDuration = state.mockBeeStartTime ? Date.now() - state.mockBeeStartTime : 0;

          const result: MockBeeResult = {
            id: 'mock_' + Date.now(),
            date: new Date().toISOString(),
            totalWords: scoredAnswers.length,
            correctCount: correctScored,
            incorrectCount: scoredAnswers.length - correctScored,
            practiceCount: updatedAnswers.length - scoredAnswers.length,
            scorePercentage,
            durationMs: totalDuration,
            answers: updatedAnswers,
          };

          set({
            mockBeeAnswers: updatedAnswers,
            mockBeeActive: false,
            lastMockBeeResult: result,
            mockBeeResultsHistory: [result, ...state.mockBeeResultsHistory].slice(0, 20),
          });
        }
      },

      finishMockBee: () => {
        const state = get();
        if (state.lastMockBeeResult) return state.lastMockBeeResult;
        
        // Forced finish if user stopped early
        const scoredAnswers = state.mockBeeAnswers.filter((a) => !a.isPractice);
        const correctScored = scoredAnswers.filter((a) => a.isCorrect).length;
        const scorePercentage = scoredAnswers.length > 0 ? Math.round((correctScored / scoredAnswers.length) * 100) : 0;
        const totalDuration = state.mockBeeStartTime ? Date.now() - state.mockBeeStartTime : 0;

        const result: MockBeeResult = {
          id: 'mock_' + Date.now(),
          date: new Date().toISOString(),
          totalWords: scoredAnswers.length,
          correctCount: correctScored,
          incorrectCount: scoredAnswers.length - correctScored,
          practiceCount: state.mockBeeAnswers.length - scoredAnswers.length,
          scorePercentage,
          durationMs: totalDuration,
          answers: state.mockBeeAnswers,
        };

        set({
          mockBeeActive: false,
          lastMockBeeResult: result,
          mockBeeResultsHistory: [result, ...state.mockBeeResultsHistory].slice(0, 20),
        });

        return result;
      },

      clearMockBee: () => {
        set({
          mockBeeActive: false,
          mockBeeWords: [],
          mockBeeIndex: 0,
          mockBeeAnswers: [],
          mockBeeStartTime: null,
          lastMockBeeResult: null,
        });
      },

      sendMockBeeErrorsToVault: (result: MockBeeResult) => {
        const errors = result.answers.filter((a) => !a.isCorrect && !a.isPractice);
        const state = get();
        const updatedWords = { ...state.words };

        for (const err of errors) {
          const key = err.word.toLowerCase();
          if (updatedWords[key]) {
            updatedWords[key] = {
              ...updatedWords[key],
              status: 'learning',
              incorrectCount: Math.max(1, updatedWords[key].incorrectCount),
            };
          }
        }

        set({ words: updatedWords });
      },

      exportUserData: () => {
        const state = get();
        const exportPayload = {
          version: '1.0',
          appName: 'Spellbean',
          exportDate: new Date().toISOString(),
          settings: state.settings,
          streakDays: state.consecutiveDaysStreak,
          todayCompleted: state.todayCompletedCount,
          lastActiveDate: state.lastActiveDate,
          mockBeeResultsHistory: state.mockBeeResultsHistory,
          words: state.words,
        };
        return JSON.stringify(exportPayload, null, 2);
      },

      importUserData: (jsonData: string) => {
        try {
          const parsed = JSON.parse(jsonData);
          if (!parsed.words || typeof parsed.words !== 'object') {
            return { success: false, message: 'Invalid file format: missing word data.' };
          }

          // Merge loaded words with official word list to guarantee all 1,604 words exist
          const initialWords = createInitialWordRecords();
          for (const [key, record] of Object.entries(parsed.words)) {
            if (initialWords[key]) {
              initialWords[key] = {
                ...initialWords[key],
                ...(record as WordRecord),
              };
            }
          }

          set({
            words: initialWords,
            settings: { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) },
            consecutiveDaysStreak: parsed.streakDays || 0,
            todayCompletedCount: parsed.todayCompleted || 0,
            lastActiveDate: parsed.lastActiveDate || '',
            mockBeeResultsHistory: Array.isArray(parsed.mockBeeResultsHistory) ? parsed.mockBeeResultsHistory : [],
          });

          return { success: true, message: `Successfully restored data for ${Object.keys(parsed.words).length} words!` };
        } catch (e: any) {
          return { success: false, message: `Failed to import JSON: ${e.message}` };
        }
      },

      resetAllProgress: () => {
        set({
          words: createInitialWordRecords(),
          dailySessionWords: [],
          dailySessionIndex: 0,
          dailySessionResults: {},
          isDailySessionActive: false,
          dailySessionCompleted: false,
          mockBeeActive: false,
          mockBeeAnswers: [],
          mockBeeResultsHistory: [],
          lastMockBeeResult: null,
          todayCompletedCount: 0,
          consecutiveDaysStreak: 0,
        });
      },
    }),
    {
      name: 'spellbean_store_v1',
      partialize: (state) => ({
        words: state.words,
        wordList: state.wordList,
        settings: state.settings,
        consecutiveDaysStreak: state.consecutiveDaysStreak,
        lastActiveDate: state.lastActiveDate,
        todayCompletedCount: state.todayCompletedCount,
        mockBeeResultsHistory: state.mockBeeResultsHistory,
      }),
      merge: (persistedState: any, currentState) => ({
        ...currentState,
        ...persistedState,
        settings: {
          ...currentState.settings,
          ...(persistedState?.settings || {}),
          selectedVoiceURI:
            persistedState?.settings?.selectedVoiceURI || 'en-PH-JamesNeural',
        },
      }),
    }
  )
);

