import { audioService } from './audio';

const letterAudioCache: Record<string, HTMLAudioElement> = {};

/**
 * Letter audio caching helper so single letters play instantly through
 * the neural voice endpoint (/api/tts) without repeated network latency.
 */
export const getLetterAudio = (letter: string, voiceName: string): HTMLAudioElement => {
  const cleanLetter = letter.toUpperCase();
  const cacheKey = `${voiceName}_${cleanLetter}`;

  if (!letterAudioCache[cacheKey]) {
    // Route to Edge TTS neural voice API endpoint
    const audioUrl = `/api/tts?text=${encodeURIComponent(cleanLetter)}&voice=${encodeURIComponent(voiceName)}`;
    const audio = new Audio(audioUrl);
    audio.preload = 'auto';
    letterAudioCache[cacheKey] = audio;
  }

  return letterAudioCache[cacheKey];
};

/**
 * Pronounce complete word using the main Neural audio player
 */
export const playFullWordNeuralAudio = async (
  word: string,
  voiceName: string,
  rate = 0.95
): Promise<void> => {
  await audioService.speakTextAsync(word, {
    voiceURI: voiceName,
    rate,
    volume: 1.0,
  });
};

export { letterAudioCache };

