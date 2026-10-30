export interface AudioProctorCallbacks {
  onStartFirst?: () => void;
  onPauseStart?: (secondsLeft: number) => void;
  onPauseTick?: (secondsLeft: number) => void;
  onStartSecond?: () => void;
  onComplete?: () => void;
  onError?: (err: any) => void;
}

class AudioEngine {
  private synth: SpeechSynthesis | null = null;
  private voices: SpeechSynthesisVoice[] = [];
  private isInitialized = false;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private pauseTimer: any = null;
  private audioCtx: AudioContext | null = null;

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

  public getDefaultVoice(): SpeechSynthesisVoice | null {
    // If a Philippine English voice is detected on the client device, prioritize it for local contest realism
    const phVoices = this.getPhilippineVoices();
    if (phVoices.length > 0) {
      return phVoices[0];
    }

    // Graceful fallback to US English voices
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
    this.currentUtterance = null;
  }

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
    if (!this.synth) return;
    this.stop();

    const voices = this.getVoices();
    let voice: SpeechSynthesisVoice | null = null;
    if (options.voiceURI) {
      voice = voices.find((v) => v.voiceURI === options.voiceURI) || this.getDefaultVoice();
    } else {
      voice = this.getDefaultVoice();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = options.rate ?? 0.85;
    utterance.pitch = options.pitch ?? 1.0;
    utterance.volume = options.volume ?? 1.0;
    utterance.lang = voice?.lang || 'en-US';
    if (voice) utterance.voice = voice;

    utterance.onend = () => {
      this.currentUtterance = null;
      if (options.onEnd) options.onEnd();
    };

    utterance.onerror = (e) => {
      this.currentUtterance = null;
      console.warn('Speech synthesis error:', e);
      if (options.onEnd) options.onEnd();
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
    if (!this.synth) return;
    this.stop();

    const pauseDuration = options.pauseDurationSeconds ?? 2;
    const rate = options.rate ?? 0.85; // Official cadence tuned for en-US clarity
    const pitch = options.pitch ?? 1.0;
    const volume = options.volume ?? 1.0;

    const voices = this.getVoices();
    let voice: SpeechSynthesisVoice | null = null;
    if (options.voiceURI) {
      voice = voices.find((v) => v.voiceURI === options.voiceURI) || this.getDefaultVoice();
    } else {
      voice = this.getDefaultVoice();
    }

    const voiceLang = voice?.lang || 'en-US';

    // Step 1: First pronunciation
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

      // Countdown interval for visual pause ticker
      this.pauseTimer = setInterval(() => {
        countdown--;
        if (countdown > 0) {
          callbacks.onPauseTick?.(countdown);
        } else {
          clearInterval(this.pauseTimer);
          this.pauseTimer = null;

          // Step 2: Second pronunciation
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
    } catch (e) {
      // AudioContext may be restricted before user gesture
    }
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
    } catch (e) {
      // AudioContext error suppressed
    }
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

