import React, { useState, useEffect, useRef } from 'react';
import {
  Settings,
  Volume2,
  Calendar,
  Download,
  Upload,
  RotateCcw,
  Check,
  AlertTriangle,
  Play,
  Sliders,
  Moon,
  Sun,
  ShieldAlert,
} from 'lucide-react';
import { useSpellingStore } from '../store/useSpellingStore';
import { audioService } from '../services/audio';

export const SettingsModal: React.FC = () => {
  const store = useSpellingStore();
  const { settings, updateSettings, exportUserData, importUserData, resetAllProgress } = store;

  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const list = audioService.getEnUsVoices();
    setVoices(list);
  }, []);

  const handleTestVoice = () => {
    audioService.pronounceWordOfficialCadence('adolescence', {
      rate: settings.speechRate,
      pitch: settings.speechPitch,
      volume: settings.speechVolume,
      voiceURI: settings.selectedVoiceURI,
      pauseDurationSeconds: settings.pauseBetweenWordsSeconds,
    });
  };

  const handleExport = () => {
    const jsonStr = exportUserData();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `spellbean_progress_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const res = importUserData(content);
      setImportStatus(res.message);
      setTimeout(() => setImportStatus(null), 4000);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleReset = () => {
    resetAllProgress();
    setShowResetConfirm(false);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fadeIn pb-16">
      {/* Title */}
      <div className="bg-white dark:bg-warm-900 rounded-3xl p-6 sm:p-8 border border-warm-200 dark:border-warm-800 shadow-sm space-y-2">
        <div className="flex items-center gap-2">
          <span className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
            <Settings className="w-5 h-5" />
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-serif text-warm-900 dark:text-warm-50">
            Competition & Audio Settings
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-warm-500 dark:text-warm-400">
          Customize proctor cadence, convention milestone dates, speech synthesis voice, and data backup.
        </p>
      </div>

      {/* Target Milestone */}
      <div className="bg-white dark:bg-warm-900 rounded-3xl p-6 border border-warm-200 dark:border-warm-800 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-warm-900 dark:text-warm-50 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-amber-500" />
          Convention Milestone Date
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
          <div>
            <label className="text-xs text-warm-500 dark:text-warm-400 block mb-1">
              Target Student Convention Date:
            </label>
            <input
              type="date"
              value={settings.targetConventionDate}
              onChange={(e) => updateSettings({ targetConventionDate: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-warm-50 dark:bg-warm-850 border border-warm-200 dark:border-warm-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-warm-900 dark:text-warm-100 font-mono"
            />
          </div>
          <p className="text-xs text-warm-500 dark:text-warm-400 leading-relaxed">
            The Daily Quota engine recalculates your daily word requirement each morning to ensure you achieve full mastery across all 1,604 words before this date.
          </p>
        </div>
      </div>

      {/* Virtual Proctor Speech Synthesizer Settings */}
      <div className="bg-white dark:bg-warm-900 rounded-3xl p-6 border border-warm-200 dark:border-warm-800 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-warm-900 dark:text-warm-50 flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-amber-500" />
            Speech Synthesizer & Proctor Cadence
          </h2>
          <button
            onClick={handleTestVoice}
            className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs transition-colors flex items-center gap-1.5"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Test Cadence</span>
          </button>
        </div>

        {/* Voice Selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-warm-600 dark:text-warm-300 block">
            Proctor Voice (en-US Recommended):
          </label>
          <select
            value={settings.selectedVoiceURI || ''}
            onChange={(e) => updateSettings({ selectedVoiceURI: e.target.value || null })}
            className="w-full px-3 py-2 text-xs bg-warm-50 dark:bg-warm-850 border border-warm-200 dark:border-warm-700 rounded-xl text-warm-800 dark:text-warm-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="">Default High-Clarity Voice</option>
            {voices.map((v) => (
              <option key={v.voiceURI} value={v.voiceURI}>
                {v.name} ({v.lang})
              </option>
            ))}
          </select>
        </div>

        {/* Sliders: Rate & Pause */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-warm-600 dark:text-warm-300">Speech Rate</span>
              <span className="font-mono text-amber-600 dark:text-amber-400 font-bold">
                {settings.speechRate.toFixed(2)}x (Official: 0.85x)
              </span>
            </div>
            <input
              type="range"
              min="0.6"
              max="1.2"
              step="0.05"
              value={settings.speechRate}
              onChange={(e) => updateSettings({ speechRate: parseFloat(e.target.value) })}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-warm-600 dark:text-warm-300">Cadence Pause</span>
              <span className="font-mono text-amber-600 dark:text-amber-400 font-bold">
                {settings.pauseBetweenWordsSeconds} seconds
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="5"
              step="1"
              value={settings.pauseBetweenWordsSeconds}
              onChange={(e) => updateSettings({ pauseBetweenWordsSeconds: parseInt(e.target.value, 10) })}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>
        </div>

        {/* Audio Toggles */}
        <div className="pt-2 border-t border-warm-100 dark:border-warm-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <label className="flex items-center gap-3 cursor-pointer text-xs text-warm-700 dark:text-warm-300">
            <input
              type="checkbox"
              checked={settings.autoSpeakOnNewWord}
              onChange={(e) => updateSettings({ autoSpeakOnNewWord: e.target.checked })}
              className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500"
            />
            <span>Auto-pronounce word when card appears</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer text-xs text-warm-700 dark:text-warm-300">
            <input
              type="checkbox"
              checked={settings.soundEffects}
              onChange={(e) => updateSettings({ soundEffects: e.target.checked })}
              className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500"
            />
            <span>Sound effects (Synthetic chime on correct answer)</span>
          </label>
        </div>
      </div>

      {/* Backup and Restore */}
      <div className="bg-white dark:bg-warm-900 rounded-3xl p-6 border border-warm-200 dark:border-warm-800 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-warm-900 dark:text-warm-50 flex items-center gap-2">
          <Download className="w-4 h-4 text-amber-500" />
          Progress Backup & Restore
        </h2>
        <p className="text-xs text-warm-500 dark:text-warm-400 leading-relaxed">
          Spellbean stores your progress 100% offline in your browser. Export periodic JSON backups to sync between devices or preserve your study records.
        </p>

        {importStatus && (
          <div className="p-3 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 rounded-xl text-xs font-semibold text-amber-800 dark:text-amber-300">
            {importStatus}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            onClick={handleExport}
            className="px-4 py-2.5 rounded-xl bg-warm-100 dark:bg-warm-800 hover:bg-warm-200 dark:hover:bg-warm-700 text-warm-800 dark:text-warm-100 font-semibold text-xs transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>Export Progress (.json)</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2.5 rounded-xl bg-warm-100 dark:bg-warm-800 hover:bg-warm-200 dark:hover:bg-warm-700 text-warm-800 dark:text-warm-100 font-semibold text-xs transition-colors flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            <span>Import Progress (.json)</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImportFile}
            className="hidden"
          />
        </div>
      </div>

      {/* Danger Zone: Reset */}
      <div className="bg-white dark:bg-warm-900 rounded-3xl p-6 border border-rose-200 dark:border-rose-950/60 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-rose-700 dark:text-rose-400 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4" />
          Reset Study Records
        </h2>
        <p className="text-xs text-warm-500 dark:text-warm-400">
          Reset all attempts, consecutive streaks, and scores back to zero. This cannot be undone unless you have a JSON backup.
        </p>

        {!showResetConfirm ? (
          <button
            onClick={() => setShowResetConfirm(true)}
            className="px-4 py-2 rounded-xl border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950 text-xs font-semibold transition-colors"
          >
            Reset All Progress...
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <button
              onClick={handleReset}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm transition-colors"
            >
              Confirm Complete Reset
            </button>
            <button
              onClick={() => setShowResetConfirm(false)}
              className="px-3 py-2 text-xs text-warm-500 hover:text-warm-800 dark:hover:text-warm-200"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
