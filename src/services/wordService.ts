import officialWordsData from '../data/sotp_spelling_words.json';

export const TOTAL_OFFICIAL_WORDS = (officialWordsData.words || []).length || 1604;
export const FREE_TIER_WORD_LIMIT = 100;

/**
 * Returns the active word list depending on Pro license status.
 * - Free: Curated 100-word sample
 * - Pro: Complete 1,604 competition words
 */
export function getActiveWords(isPro: boolean): string[] {
  const allWords: string[] = officialWordsData.words || [];
  if (isPro) {
    return allWords;
  }
  return allWords.slice(0, FREE_TIER_WORD_LIMIT);
}

/**
 * Checks if a specific word is included in the active word set.
 */
export function isWordInActiveSet(word: string, isPro: boolean): boolean {
  if (!word) return false;
  const activeWords = getActiveWords(isPro).map((w) => w.toLowerCase());
  return activeWords.includes(word.toLowerCase());
}
