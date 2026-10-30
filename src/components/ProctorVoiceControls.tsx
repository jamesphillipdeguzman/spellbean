import React, { useState, useEffect } from 'react';
import { Volume2, BookOpen, Tag, MessageSquare, Globe, Loader2, StopCircle } from 'lucide-react';
import { audioService, isNeuralVoice } from '../services/audio';
import { fetchWordDefinition, maskWordInSentence, getSpokenSentence } from '../services/dictionary';
import { useSpellingStore } from '../store/useSpellingStore';
import { WordDefinition } from '../types';
import { BrainAiFlashLine } from './icons/BrainAiFlashLine';

interface ProctorVoiceControlsProps {
  word: string;
  autoSpeakOnMount?: boolean;
  onSpoken?: () => void;
  hideWordInDefinition?: boolean;
}

export const ProctorVoiceControls: React.FC<ProctorVoiceControlsProps> = ({
  word,
  autoSpeakOnMount = false,
  onSpoken,
  hideWordInDefinition = true,
}) => {
  const settings = useSpellingStore((s) => s.settings);

  const [isSpeakingOfficial, setIsSpeakingOfficial] = useState(false);
  const [pauseCountdown, setPauseCountdown] = useState<number | null>(null);
  const [definitionData, setDefinitionData] = useState<WordDefinition | null>(null);
  const [isLoadingDef, setIsLoadingDef] = useState(false);

  // Active display inquiry card: 'none' | 'definition' | 'pos' | 'sentence' | 'origin'
  const [activeInquiry, setActiveInquiry] = useState<'none' | 'definition' | 'pos' | 'sentence' | 'origin'>('none');
  const [inquiryText, setInquiryText] = useState<string>('');

  // Load definition in background whenever word changes
  useEffect(() => {
    let isCancelled = false;
    setIsLoadingDef(true);
    setActiveInquiry('none');
    setInquiryText('');
    setPauseCountdown(null);
    setIsSpeakingOfficial(false);

    fetchWordDefinition(word).then((def) => {
      if (!isCancelled) {
        setDefinitionData(def);
        setIsLoadingDef(false);
      }
    });

    if (autoSpeakOnMount && settings.autoSpeakOnNewWord) {
      const timer = setTimeout(() => {
        handleSayOfficialCadence();
      }, 400);
      return () => {
        isCancelled = true;
        clearTimeout(timer);
        audioService.stop();
      };
    }

    return () => {
      isCancelled = true;
      audioService.stop();
    };
  }, [word]);

  const handleSayOfficialCadence = () => {
    setIsSpeakingOfficial(true);
    setPauseCountdown(null);

    audioService.pronounceWordOfficialCadence(
      word,
      {
        rate: settings.speechRate,
        pitch: settings.speechPitch,
        volume: settings.speechVolume,
        voiceURI: settings.selectedVoiceURI,
        pauseDurationSeconds: settings.pauseBetweenWordsSeconds,
      },
      {
        onStartFirst: () => {
          setIsSpeakingOfficial(true);
        },
        onPauseStart: (countdown) => {
          setPauseCountdown(countdown);
        },
        onPauseTick: (countdown) => {
          setPauseCountdown(countdown);
        },
        onStartSecond: () => {
          setPauseCountdown(null);
        },
        onComplete: () => {
          setIsSpeakingOfficial(false);
          setPauseCountdown(null);
          onSpoken?.();
        },
        onError: () => {
          setIsSpeakingOfficial(false);
          setPauseCountdown(null);
        },
      }
    );
  };

  const handleRepeatOnce = () => {
    audioService.speakText(word, {
      rate: settings.speechRate,
      pitch: settings.speechPitch,
      volume: settings.speechVolume,
      voiceURI: settings.selectedVoiceURI,
    });
  };

  const handleInquiryDefinition = async () => {
    const def = definitionData || (await fetchWordDefinition(word));
    setActiveInquiry('definition');
    const spoken = def.definition || 'Definition not found.';
    setInquiryText(spoken);

    audioService.speakText(`Definition: ${spoken}`, {
      rate: settings.speechRate,
      pitch: settings.speechPitch,
      volume: settings.speechVolume,
      voiceURI: settings.selectedVoiceURI,
    });
  };

  const handleInquiryPartOfSpeech = async () => {
    const def = definitionData || (await fetchWordDefinition(word));
    setActiveInquiry('pos');
    const pos = def.partOfSpeech || 'noun';
    setInquiryText(`Part of speech: ${pos}`);

    audioService.speakText(`Part of speech: ${pos}`, {
      rate: settings.speechRate,
      pitch: settings.speechPitch,
      volume: settings.speechVolume,
      voiceURI: settings.selectedVoiceURI,
    });
  };

  const handleInquirySentence = async () => {
    const def = definitionData || (await fetchWordDefinition(word));
    setActiveInquiry('sentence');
    const rawSentence = def.exampleSentence || `The contestant prepared to spell the word with precision.`;
    const masked = maskWordInSentence(rawSentence, word);
    const spoken = getSpokenSentence(rawSentence, word);
    setInquiryText(masked);

    audioService.speakText(`Sentence: ${spoken}`, {
      rate: settings.speechRate,
      pitch: settings.speechPitch,
      volume: settings.speechVolume,
      voiceURI: settings.selectedVoiceURI,
    });
  };

  const handleInquiryOrigin = async () => {
    const def = definitionData || (await fetchWordDefinition(word));
    setActiveInquiry('origin');
    const origin = def.origin || 'Convention Word Bank (2026 Edition Guidelines)';
    setInquiryText(`Origin / Root: ${origin}`);

    audioService.speakText(`Language of origin: ${origin}`, {
      rate: settings.speechRate,
      pitch: settings.speechPitch,
      volume: settings.speechVolume,
      voiceURI: settings.selectedVoiceURI,
    });
  };

  const handleStopAudio = () => {
    audioService.stop();
    setIsSpeakingOfficial(false);
    setPauseCountdown(null);
  };

  return (
    <div className="w-full space-y-4">
      {/* Top Bar: Official Say Word & Stop button */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <button
          onClick={handleSayOfficialCadence}
          className={`relative group px-6 py-3.5 rounded-2xl font-bold text-base transition-all duration-200 flex items-center justify-center gap-3 shadow-md active:scale-95 ${
            isSpeakingOfficial
              ? 'bg-amber-500 text-white ring-4 ring-amber-300 dark:ring-amber-800 animate-pulse'
              : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-amber-500/20 hover:shadow-lg hover:shadow-amber-500/30'
          }`}
          title="Official Cadence: Pronounces word twice with a 2-second pause (Shortcut: Space)"
        >
          <Volume2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
          <span>
            {pauseCountdown !== null ? `Repeating in ${pauseCountdown}s...` : isSpeakingOfficial ? 'Proctor Speaking...' : 'Say Word (Official 2x)'}
          </span>
          <kbd className="hidden sm:inline-block px-2 py-0.5 text-xs font-mono bg-amber-700/40 text-amber-100 rounded border border-amber-400/40">
            Space
          </kbd>
        </button>

        <button
          onClick={handleRepeatOnce}
          className="px-4 py-3.5 rounded-2xl font-semibold text-sm bg-warm-200 hover:bg-warm-300 dark:bg-warm-800 dark:hover:bg-warm-700 text-warm-800 dark:text-warm-100 transition-colors flex items-center gap-2 border border-warm-300 dark:border-warm-700"
          title="Repeat word once (Shortcut: R)"
        >
          <Volume2 className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <span>Repeat (1x)</span>
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-xs font-mono bg-warm-300 dark:bg-warm-700 text-warm-700 dark:text-warm-300 rounded">
            R
          </kbd>
        </button>

        {(isSpeakingOfficial || pauseCountdown !== null) && (
          <button
            onClick={handleStopAudio}
            className="px-3 py-3 rounded-2xl text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/60 transition-colors"
            title="Stop audio"
          >
            <StopCircle className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Voice Badge Indicator */}
      <div className="flex items-center justify-center gap-1.5 text-[11px] text-warm-500 dark:text-warm-400">
        {isNeuralVoice(settings.selectedVoiceURI) ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200/80 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 font-semibold">
            <BrainAiFlashLine className="w-3.5 h-3.5 text-amber-500" />
            <span>
              🇵🇭 Neural Proctor Active (
              {settings.selectedVoiceURI === 'en-PH-RosaNeural'
                ? 'Rosa'
                : settings.selectedVoiceURI === 'en-US-JennyNeural'
                ? 'Jenny'
                : 'James'}
              )
            </span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-warm-100 dark:bg-warm-800 text-warm-600 dark:text-warm-400 font-medium text-[10px]">
            <span>Device Voice Active</span>
          </span>
        )}
      </div>

      {/* Contest Inquiries Action Row */}
      <div className="bg-warm-50 dark:bg-warm-900/60 p-3 rounded-2xl border border-warm-200 dark:border-warm-800">
        <div className="text-[11px] font-semibold text-warm-500 dark:text-warm-400 uppercase tracking-wider mb-2 flex items-center justify-between px-1">
          <span className="flex items-center gap-1.5">
            <img 
              src="/lightbulb-flash-line.svg" 
              alt="Inquiries" 
              className="w-3.5 h-3.5 text-amber-500 inline-block align-middle brightness-125" 
            />
            Allowed Contest Inquiries
          </span>
          {isLoadingDef && (
            <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 normal-case">
              <Loader2 className="w-3 h-3 animate-spin" />
              Loading dictionary...
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button
            onClick={handleInquiryDefinition}
            className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all border ${
              activeInquiry === 'definition'
                ? 'bg-amber-100 border-amber-300 text-amber-900 dark:bg-amber-950/70 dark:border-amber-700 dark:text-amber-200 shadow-sm'
                : 'bg-white dark:bg-warm-800 border-warm-200 dark:border-warm-700 text-warm-700 dark:text-warm-200 hover:bg-warm-100 dark:hover:bg-warm-750'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>Definition</span>
            <kbd className="hidden md:inline-block text-[10px] opacity-60 font-mono">D</kbd>
          </button>

          <button
            onClick={handleInquiryPartOfSpeech}
            className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all border ${
              activeInquiry === 'pos'
                ? 'bg-amber-100 border-amber-300 text-amber-900 dark:bg-amber-950/70 dark:border-amber-700 dark:text-amber-200 shadow-sm'
                : 'bg-white dark:bg-warm-800 border-warm-200 dark:border-warm-700 text-warm-700 dark:text-warm-200 hover:bg-warm-100 dark:hover:bg-warm-750'
            }`}
          >
            <Tag className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>Part of Speech</span>
            <kbd className="hidden md:inline-block text-[10px] opacity-60 font-mono">P</kbd>
          </button>

          <button
            onClick={handleInquirySentence}
            className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all border ${
              activeInquiry === 'sentence'
                ? 'bg-amber-100 border-amber-300 text-amber-900 dark:bg-amber-950/70 dark:border-amber-700 dark:text-amber-200 shadow-sm'
                : 'bg-white dark:bg-warm-800 border-warm-200 dark:border-warm-700 text-warm-700 dark:text-warm-200 hover:bg-warm-100 dark:hover:bg-warm-750'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>Sentence</span>
            <kbd className="hidden md:inline-block text-[10px] opacity-60 font-mono">S</kbd>
          </button>

          <button
            onClick={handleInquiryOrigin}
            className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all border ${
              activeInquiry === 'origin'
                ? 'bg-amber-100 border-amber-300 text-amber-900 dark:bg-amber-950/70 dark:border-amber-700 dark:text-amber-200 shadow-sm'
                : 'bg-white dark:bg-warm-800 border-warm-200 dark:border-warm-700 text-warm-700 dark:text-warm-200 hover:bg-warm-100 dark:hover:bg-warm-750'
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>Origin / Root</span>
          </button>
        </div>

        {/* Revealed Inquiry Output Area */}
        {activeInquiry !== 'none' && inquiryText && (
          <div className="mt-3 p-3.5 bg-amber-50/80 dark:bg-amber-950/30 rounded-xl border border-amber-200/80 dark:border-amber-800/60 text-sm text-warm-800 dark:text-warm-100 animate-fadeIn">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="font-semibold text-amber-800 dark:text-amber-300 capitalize text-xs block mb-1">
                  {activeInquiry === 'pos' ? 'Part of Speech' : activeInquiry === 'sentence' ? 'Sentence in Context' : activeInquiry}:
                </span>
                <p className="italic font-serif leading-relaxed text-warm-800 dark:text-warm-200">
                  {inquiryText}
                </p>
                {activeInquiry === 'sentence' && (
                  <p className="text-[11px] text-warm-500 dark:text-warm-400 mt-1 not-italic">
                    * The target word is intentionally masked with blanks per convention guidelines.
                  </p>
                )}
              </div>
              <button
                onClick={() => setActiveInquiry('none')}
                className="text-warm-400 hover:text-warm-600 dark:hover:text-warm-200 text-xs px-1.5 py-0.5 rounded"
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

