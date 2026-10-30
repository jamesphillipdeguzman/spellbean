import { WordDefinition } from '../types';
import { generateFallbackDefinition } from '../data/offlineDictionary';

const DICT_CACHE_KEY = 'spellbean_dict_cache_v1';

// In-memory cache for speed
const memoryCache = new Map<string, WordDefinition>();

// Load localStorage cache into memory
function loadStoredCache(): void {
  try {
    const raw = localStorage.getItem(DICT_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      for (const [k, v] of Object.entries(parsed)) {
        memoryCache.set(k.toLowerCase(), v as WordDefinition);
      }
    }
  } catch (e) {
    console.warn('Could not load dictionary cache from storage', e);
  }
}

// Save back to localStorage periodically
function saveToStorageCache(word: string, def: WordDefinition): void {
  try {
    const raw = localStorage.getItem(DICT_CACHE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    parsed[word.toLowerCase()] = def;
    localStorage.setItem(DICT_CACHE_KEY, JSON.stringify(parsed));
  } catch (e) {
    console.warn('Could not persist dictionary cache', e);
  }
}

// Initialize cache on startup
loadStoredCache();

export async function fetchWordDefinition(word: string): Promise<WordDefinition> {
  const normalized = word.trim().toLowerCase();

  // 1. Check in-memory / storage cache
  if (memoryCache.has(normalized)) {
    return memoryCache.get(normalized)!;
  }

  // 2. Fallback definition ready if offline or API fails
  const fallback = generateFallbackDefinition(word);

  // 3. Attempt Free Dictionary API if online
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    memoryCache.set(normalized, fallback);
    return fallback;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500); // 3.5s timeout

    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(normalized)}`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const item = data[0];
        const phonetic = item.phonetic || (item.phonetics?.find((p: any) => p.text)?.text) || fallback.phonetic;
        const origin = item.origin || fallback.origin;

        let partOfSpeech = fallback.partOfSpeech;
        let definition = fallback.definition;
        let exampleSentence = fallback.exampleSentence;
        const synonyms: string[] = [];

        if (item.meanings && item.meanings.length > 0) {
          const firstMeaning = item.meanings[0];
          partOfSpeech = firstMeaning.partOfSpeech || partOfSpeech;

          // Find first clean definition
          for (const m of item.meanings) {
            if (m.definitions && m.definitions.length > 0) {
              for (const d of m.definitions) {
                if (d.definition && (!definition || definition.includes('Official SOT'))) {
                  definition = d.definition;
                }
                if (d.example && (!exampleSentence || exampleSentence.includes('spelled the word'))) {
                  exampleSentence = d.example;
                }
                if (d.synonyms && Array.isArray(d.synonyms)) {
                  synonyms.push(...d.synonyms);
                }
              }
            }
          }
        }

        const result: WordDefinition = {
          word,
          phonetic,
          partOfSpeech,
          definition: definition || fallback.definition,
          exampleSentence: exampleSentence || fallback.exampleSentence,
          origin,
          synonyms: synonyms.slice(0, 5),
        };

        memoryCache.set(normalized, result);
        saveToStorageCache(normalized, result);
        return result;
      }
    }
  } catch (err) {
    // Graceful offline fallback
    console.debug('Dictionary fetch notice (using offline definition):', err);
  }

  memoryCache.set(normalized, fallback);
  saveToStorageCache(normalized, fallback);
  return fallback;
}

/**
 * Masks the word in an example sentence so contestants don't see the answer
 * Handles plurals and common suffixes if present
 */
export function maskWordInSentence(sentence: string, targetWord: string): string {
  if (!sentence || !targetWord) return sentence || '';

  // Escaping target word for RegExp
  const escaped = targetWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Match the word with potential morphological endings like s, ed, ing
  const regex = new RegExp(`\\b${escaped}(s|es|ed|ing|ly)?\\b`, 'gi');

  return sentence.replace(regex, '__________');
}

/**
 * Replaces the word with the word "blank" so TTS can read the sentence aloud without spoiling the spelling!
 */
export function getSpokenSentence(sentence: string, targetWord: string): string {
  if (!sentence || !targetWord) return sentence || '';
  const escaped = targetWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`\\b${escaped}(s|es|ed|ing|ly)?\\b`, 'gi');
  return sentence.replace(regex, 'blank');
}

