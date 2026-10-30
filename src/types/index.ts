export type WordStatus = 'unseen' | 'learning' | 'mastered';

export interface WordRecord {
  id: string;
  word: string; // Official casing from list
  status: WordStatus;
  attempts: number;
  correctCount: number;
  incorrectCount: number;
  lastAttempted?: string; // ISO date string
  consecutiveStreak: number; // 3 consecutive correct recalls = 'mastered'
  userNotes?: string;
  starred?: boolean;
}

export type InputMode = 'typing' | 'paper';

export interface WordDefinition {
  word: string;
  phonetic?: string;
  partOfSpeech?: string;
  definition?: string;
  exampleSentence?: string;
  origin?: string;
  synonyms?: string[];
}

export interface DailySessionConfig {
  batchSize: number; // typically 30 - 50 words
  unmasteredRatio: number; // e.g. 0.7 (70% unmastered/unseen)
  missedRatio: number; // e.g. 0.3 (30% missed vault)
  targetDate: string; // YYYY-MM-DD, e.g. "2027-02-01"
}

export interface MockBeeConfig {
  wordCount: 25 | 50 | 100;
  includePracticeWords: boolean; // 2 unscored practice words per SOT rules
  inputMode: InputMode;
}

export interface MockBeeAnswer {
  word: string;
  isPractice: boolean;
  userInput: string; // For typing mode
  isCorrect: boolean;
  timeSpentMs: number;
  revealedAt?: string;
}

export interface MockBeeResult {
  id: string;
  date: string;
  totalWords: number;
  correctCount: number;
  incorrectCount: number;
  practiceCount: number;
  scorePercentage: number;
  durationMs: number;
  answers: MockBeeAnswer[];
}

export interface AppSettings {
  inputMode: InputMode;
  speechRate: number; // default 0.85
  speechPitch: number; // default 1.0
  speechVolume: number; // default 1.0
  selectedVoiceURI: string | null;
  targetConventionDate: string; // default "2027-02-01"
  dailyGoal: number; // default 30
  soundEffects: boolean;
  autoSpeakOnNewWord: boolean;
  pauseBetweenWordsSeconds: number; // default 2
  darkMode: boolean;
  highContrast: boolean;
}

