export interface AudioProctorCallbacks {
  onStartFirst?: () => void;
  onPauseStart?: (secondsLeft: number) => void;
  onPauseTick?: (secondsLeft: number) => void;
  onStartSecond?: () => void;
  onComplete?: () => void;
  onError?: (err: any) => void;
}

export interface NeuralVoice {
  id: string;
  name: string;
  lang: string;
  gender: 'Male' | 'Female';
  recommended?: boolean;
}

export const NEURAL_VOICES: NeuralVoice[] = [
  {
    id: 'en-PH-JamesNeural',
    name: 'James (Neural) — English (Philippines) [Recommended]',
    lang: 'en-PH',
    gender: 'Male',
    recommended: true,
  },
  {
    id: 'en-PH-RosaNeural',
    name: 'Rosa (Neural) — English (Philippines)',
    lang: 'en-PH',
    gender: 'Female',
  },
  {
    id: 'en-US-JennyNeural',
    name: 'Jenny (Neural) — English (United States)',
    lang: 'en-US',
    gender: 'Female',
  },
];

export function isNeuralVoice(voiceId?: string | null): boolean {
  if (!voiceId) return false;
  return NEURAL_VOICES.some((v) => v.id === voiceId);
}

class AudioEngine {
  private synth: SpeechSynthesis | null = null;
  private voices: SpeechSynthesisVoice[] = [];
  private isInitialized = false;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private currentAudioElement: HTMLAudioElement | null = null;
  private pauseTimer: any = null;
  private audioCtx: AudioContext | null = null;

  // In-memory cache for audio object URLs: key -> objectUrl
  private audioCache = new Map<string, string>();

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      this.initVoices();
      if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = () => this.initVoices();
      }
    }
  }

  private initVoices() {
    if (!this.synth) return;
    this.voices = this.synth.getVoices();
    this.isInitialized = true;
  }

  public getVoices(): SpeechSynthesisVoice[] {
    if (!this.synth) return [];
    if (this.voices.length === 0) {
      this.voices = this.synth.getVoices();
    }
    return this.voices;
  }

  public isPhilippineVoice(v: SpeechSynthesisVoice): boolean {
    const l = v.lang.toLowerCase();
    const n = v.name.toLowerCase();
    return (
      l === 'en-ph' ||
      l === 'en_ph' ||
      l.startsWith('fil') ||
      n.includes('philippines') ||
      n.includes('filipino') ||
      n.includes('angelo') ||
      n.includes('rosa')
    );
  }

  public getPhilippineVoices(): SpeechSynthesisVoice[] {
    return this.getVoices().filter((v) => this.isPhilippineVoice(v));
  }

  public getEnUsVoices(): SpeechSynthesisVoice[] {
    return this.getVoices().filter(
      (v) => (v.lang.startsWith('en-US') || v.lang.startsWith('en_US')) && !this.isPhilippineVoice(v)
    );
  }

  public getOtherEnglishVoices(): SpeechSynthesisVoice[] {
    return this.getVoices().filter(
      (v) =>
        v.lang.toLowerCase().startsWith('en') &&
        !this.isPhilippineVoice(v) &&
        !v.lang.startsWith('en-US') &&
        !v.lang.startsWith('en_US')
    );
  }

  public getGroupedVoices(): {
    philippine: SpeechSynthesisVoice[];
    us: SpeechSynthesisVoice[];
    otherEnglish: SpeechSynthesisVoice[];
  } {
    return {
      philippine: this.getPhilippineVoices(),
      us: this.getEnUsVoices(),
      otherEnglish: this.getOtherEnglishVoices(),
    };
  }

  public getDefaultBrowserVoice(): SpeechSynthesisVoice | null {
    // Check for offline Philippine voice first
    const phVoices = this.getPhilippineVoices();
    if (phVoices.length > 0) {
      return phVoices[0];
    }

    // Fall back to US English
    const enUs = this.getEnUsVoices();
    if (enUs.length > 0) {
      const preferredNames = [
        'Google US English',
        'Samantha',
        'Microsoft Jenny',
        'Microsoft Guy',
        'Microsoft David',
        'Microsoft Zira',
        'Alex',
      ];
      for (const name of preferredNames) {
        const match = enUs.find((v) => v.name.includes(name));
        if (match) return match;
      }
      return enUs[0];
    }

    const all = this.getVoices();
    return all[0] || null;
  }

  public stop() {
    if (this.pauseTimer) {
      clearInterval(this.pauseTimer);
      this.pauseTimer = null;
    }
    if (this.synth) {
      this.synth.cancel();
    }
    if (this.currentAudioElement) {
      this.currentAudioElement.pause();
      this.currentAudioElement.currentTime = 0;
      this.currentAudioElement = null;
    }
    this.currentUtterance = null;
  }

  /**
   * Synthesize audio buffer via Neural Edge TTS endpoint (/api/tts)
   */
  public async getNeuralAudioUrl(
    text: string,
    voiceId: string,
    speechRate = 0.85
  ): Promise<string> {
    const ratePercent = `${Math.round((speechRate - 1) * 100)}%`;
    const cacheKey = `${voiceId}:${ratePercent}:${text.trim().toLowerCase()}`;

    if (this.audioCache.has(cacheKey)) {
      return this.audioCache.get(cacheKey)!;
    }

    const endpoint = `/api/tts?text=${encodeURIComponent(text.trim())}&voice=${encodeURIComponent(voiceId)}&rate=${encodeURIComponent(ratePercent)}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000); // 6s timeout

    const res = await fetch(endpoint, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) {
      throw new Error(`TTS server error: HTTP ${res.status}`);
    }

    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    this.audioCache.set(cacheKey, objectUrl);
    return objectUrl;
  }

  /**
   * Plays text aloud using the Audio Pipeline:
   * 1. If Neural voice selected and online -> play via Neural Edge Audio
   * 2. If Neural fails, offline, or browser voice selected -> fallback to Web Speech API
   */
  public speakText(
    text: string,
    options: {
      rate?: number;
      pitch?: number;
      volume?: number;
      voiceURI?: string | null;
      onEnd?: () => void;
    } = {}
  ) {
    this.stop();

    const voiceURI = options.voiceURI || 'en-PH-JamesNeural';
    const rate = options.rate ?? 0.85;

    // Check if user selected an Edge Neural Voice
    if (isNeuralVoice(voiceURI) && typeof navigator !== 'undefined' && navigator.onLine) {
      this.playNeuralSpeech(text, voiceURI, rate, options.volume ?? 1.0, options.onEnd).catch((err) => {
        console.warn('Neural TTS playback notice (falling back to device speech):', err);
        this.fallbackWebSpeech(text, options);
      });
      return;
    }

    // Direct Browser Speech Synthesis Fallback
    this.fallbackWebSpeech(text, options);
  }

  private async playNeuralSpeech(
    text: string,
    voiceId: string,
    rate: number,
    volume: number,
    onEnd?: () => void
  ) {
    const audioUrl = await this.getNeuralAudioUrl(text, voiceId, rate);
    const audio = new Audio(audioUrl);
    audio.volume = Math.max(0, Math.min(1, volume));

    this.currentAudioElement = audio;

    audio.onended = () => {
      this.currentAudioElement = null;
      onEnd?.();
    };

    audio.onerror = (e) => {
      this.currentAudioElement = null;
      throw new Error(`Neural Audio error: ${e}`);
    };

    await audio.play();
  }

  private fallbackWebSpeech(
    text: string,
    options: {
      rate?: number;
      pitch?: number;
      volume?: number;
      voiceURI?: string | null;
      onEnd?: () => void;
    }
  ) {
    if (!this.synth) {
      options.onEnd?.();
      return;
    }

    const voices = this.getVoices();
    let voice: SpeechSynthesisVoice | null = null;

    if (options.voiceURI && !isNeuralVoice(options.voiceURI)) {
      voice = voices.find((v) => v.voiceURI === options.voiceURI) || this.getDefaultBrowserVoice();
    } else {
      voice = this.getDefaultBrowserVoice();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = options.rate ?? 0.85;
    utterance.pitch = options.pitch ?? 1.0;
    utterance.volume = options.volume ?? 1.0;
    utterance.lang = voice?.lang || 'en-PH';
    if (voice) utterance.voice = voice;

    utterance.onend = () => {
      this.currentUtterance = null;
      options.onEnd?.();
    };

    utterance.onerror = (e) => {
      this.currentUtterance = null;
      console.warn('Browser speech synthesis error:', e);
      options.onEnd?.();
    };

    this.currentUtterance = utterance;
    this.synth.speak(utterance);
  }

  /**
   * Official Cadence: Prominent "Say Word" action that pronounces the target word twice
   * with a 2-second pause in between.
   */
  public pronounceWordOfficialCadence(
    word: string,
    options: {
      rate?: number;
      pitch?: number;
      volume?: number;
      voiceURI?: string | null;
      pauseDurationSeconds?: number;
    } = {},
    callbacks: AudioProctorCallbacks = {}
  ) {
    this.stop();

    const pauseDuration = options.pauseDurationSeconds ?? 2;
    const rate = options.rate ?? 0.85;
    const voiceURI = options.voiceURI || 'en-PH-JamesNeural';
    const volume = options.volume ?? 1.0;

    // Check if neural voice pipeline can be used
    if (isNeuralVoice(voiceURI) && typeof navigator !== 'undefined' && navigator.onLine) {
      this.pronounceNeuralCadence(word, voiceURI, rate, volume, pauseDuration, callbacks).catch((err) => {
        console.warn('Neural cadence error (falling back to device speech):', err);
        this.pronounceWebSpeechCadence(word, options, callbacks);
      });
      return;
    }

    // Direct Browser Speech Cadence
    this.pronounceWebSpeechCadence(word, options, callbacks);
  }

  private async pronounceNeuralCadence(
    word: string,
    voiceId: string,
    rate: number,
    volume: number,
    pauseDuration: number,
    callbacks: AudioProctorCallbacks
  ) {
    // Preload audio URL (instant subsequent replay)
    const audioUrl = await this.getNeuralAudioUrl(word, voiceId, rate);

    callbacks.onStartFirst?.();

    // 1st Pronunciation
    const firstAudio = new Audio(audioUrl);
    firstAudio.volume = volume;
    this.currentAudioElement = firstAudio;

    firstAudio.onended = () => {
      this.currentAudioElement = null;
      let countdown = pauseDuration;
      callbacks.onPauseStart?.(countdown);

      this.pauseTimer = setInterval(() => {
        countdown--;
        if (countdown > 0) {
          callbacks.onPauseTick?.(countdown);
        } else {
          clearInterval(this.pauseTimer);
          this.pauseTimer = null;

          // 2nd Pronunciation
          callbacks.onStartSecond?.();
          const secondAudio = new Audio(audioUrl);
          secondAudio.volume = volume;
          this.currentAudioElement = secondAudio;

          secondAudio.onended = () => {
            this.currentAudioElement = null;
            callbacks.onComplete?.();
          };

          secondAudio.onerror = (e) => {
            this.currentAudioElement = null;
            callbacks.onError?.(e);
            callbacks.onComplete?.();
          };

          secondAudio.play().catch((e) => {
            callbacks.onError?.(e);
            callbacks.onComplete?.();
          });
        }
      }, 1000);
    };

    firstAudio.onerror = (e) => {
      this.currentAudioElement = null;
      callbacks.onError?.(e);
      callbacks.onComplete?.();
    };

    await firstAudio.play();
  }

  private pronounceWebSpeechCadence(
    word: string,
    options: {
      rate?: number;
      pitch?: number;
      volume?: number;
      voiceURI?: string | null;
      pauseDurationSeconds?: number;
    },
    callbacks: AudioProctorCallbacks
  ) {
    if (!this.synth) {
      callbacks.onComplete?.();
      return;
    }

    const pauseDuration = options.pauseDurationSeconds ?? 2;
    const rate = options.rate ?? 0.85;
    const pitch = options.pitch ?? 1.0;
    const volume = options.volume ?? 1.0;

    const voices = this.getVoices();
    let voice: SpeechSynthesisVoice | null = null;
    if (options.voiceURI && !isNeuralVoice(options.voiceURI)) {
      voice = voices.find((v) => v.voiceURI === options.voiceURI) || this.getDefaultBrowserVoice();
    } else {
      voice = this.getDefaultBrowserVoice();
    }

    const voiceLang = voice?.lang || 'en-PH';

    const firstUtterance = new SpeechSynthesisUtterance(word);
    firstUtterance.rate = rate;
    firstUtterance.pitch = pitch;
    firstUtterance.volume = volume;
    firstUtterance.lang = voiceLang;
    if (voice) firstUtterance.voice = voice;

    callbacks.onStartFirst?.();

    firstUtterance.onend = () => {
      let countdown = pauseDuration;
      callbacks.onPauseStart?.(countdown);

      this.pauseTimer = setInterval(() => {
        countdown--;
        if (countdown > 0) {
          callbacks.onPauseTick?.(countdown);
        } else {
          clearInterval(this.pauseTimer);
          this.pauseTimer = null;

          callbacks.onStartSecond?.();
          const secondUtterance = new SpeechSynthesisUtterance(word);
          secondUtterance.rate = rate;
          secondUtterance.pitch = pitch;
          secondUtterance.volume = volume;
          secondUtterance.lang = voiceLang;
          if (voice) secondUtterance.voice = voice;

          secondUtterance.onend = () => {
            this.currentUtterance = null;
            callbacks.onComplete?.();
          };

          secondUtterance.onerror = (e) => {
            this.currentUtterance = null;
            callbacks.onError?.(e);
            callbacks.onComplete?.();
          };

          this.currentUtterance = secondUtterance;
          this.synth?.speak(secondUtterance);
        }
      }, 1000);
    };

    firstUtterance.onerror = (e) => {
      this.currentUtterance = null;
      callbacks.onError?.(e);
      callbacks.onComplete?.();
    };

    this.currentUtterance = firstUtterance;
    this.synth.speak(firstUtterance);
  }

  // Sound Effects using Web Audio API synthesis
  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  public playCorrectChime() {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      // Soft major chime chord: E5, G#5, B5
      const notes = [659.25, 830.61, 987.77];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);

        gain.gain.setValueAtTime(0.001, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.12, now + idx * 0.08 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.08 + 0.5);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.55);
      });
    } catch (e) {}
  }

  public playIncorrectCue() {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(160, now + 0.25);

      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.32);
    } catch (e) {}
  }

  public playClickTone() {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      gain.gain.setValueAtTime(0.03, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.05);
    } catch (e) {}
  }
}

export const audioService = new AudioEngine();
