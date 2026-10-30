import { audioService } from './audio';
export * from './audio';

/**
 * Resolves active proctor speech synthesis voice from window.speechSynthesis.getVoices().
 * Matches Pro neural voice or localized proctor preferences with fallback to natural/en-US voices.
 */
export const resolveActiveVoice = (
  selectedProctorVoice?: string | null,
  isProUnlocked: boolean = false
): SpeechSynthesisVoice | null => {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;

  // 1. If Pro is active, match the specific neural voice or localized proctor
  if (isProUnlocked && selectedProctorVoice) {
    const match = voices.find(
      (v) =>
        v.name.toLowerCase().includes(selectedProctorVoice.toLowerCase()) ||
        v.voiceURI.toLowerCase().includes(selectedProctorVoice.toLowerCase())
    );
    if (match) return match;

    // Tagalog / Philippine English fallback match
    if (
      selectedProctorVoice.includes('PH') ||
      selectedProctorVoice.toLowerCase().includes('james') ||
      selectedProctorVoice.toLowerCase().includes('rosa')
    ) {
      const phMatch = voices.find(
        (v) => v.lang.startsWith('en-PH') || v.lang.startsWith('fil') || v.lang.startsWith('tl')
      );
      if (phMatch) return phMatch;
    }

    if (selectedProctorVoice.toLowerCase().includes('jenny')) {
      const jennyMatch = voices.find(
        (v) => v.name.toLowerCase().includes('jenny') || v.lang.startsWith('en-US')
      );
      if (jennyMatch) return jennyMatch;
    }
  } else if (selectedProctorVoice) {
    const match = voices.find(
      (v) =>
        v.name.toLowerCase().includes(selectedProctorVoice.toLowerCase()) ||
        v.voiceURI.toLowerCase().includes(selectedProctorVoice.toLowerCase())
    );
    if (match) return match;
  }

  // 2. Fallback to preferred English natural voice rather than raw system default
  return (
    voices.find(
      (v) =>
        v.lang.startsWith('en') &&
        (v.name.includes('Natural') || v.name.includes('Neural') || v.name.includes('Online'))
    ) ||
    voices.find((v) => v.lang.startsWith('en-US')) ||
    voices[0] ||
    null
  );
};

export { audioService as default };
