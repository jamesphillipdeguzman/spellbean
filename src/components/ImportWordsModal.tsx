import React, { useState, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  X,
  Upload,
  FileText,
  FileSpreadsheet,
  FileCheck2,
  Lock,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  KeyRound,
  ArrowRight,
  RotateCcw,
  PlusCircle,
  HelpCircle,
  Search,
  Filter,
} from 'lucide-react';
import { useLicenseStore } from '../store/licenseStore';
import { useSpellingStore } from '../store/useSpellingStore';
import {
  parseRawTextWords,
  parseCsvFile,
  parseExcelFile,
  parsePdfFile,
} from '../services/documentParser';

interface ImportWordsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'text_csv' | 'excel' | 'pdf';

interface ParsedWordItem {
  word: string;
  isExisting: boolean;
  selected: boolean;
}

export const ImportWordsModal: React.FC<ImportWordsModalProps> = ({ isOpen, onClose }) => {
  const { isProUnlocked, unlockPro, licenseCode } = useLicenseStore();
  const { words, addCustomWords } = useSpellingStore();

  const [activeTab, setActiveTab] = useState<TabType>('text_csv');
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [promoFeedback, setPromoFeedback] = useState<{ success: boolean; message: string } | null>(null);

  // Parsing & File state
  const [rawText, setRawText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [parseProgress, setParseProgress] = useState<{ page: number; total: number } | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  // Review & Deduplication state
  const [reviewItems, setReviewItems] = useState<ParsedWordItem[] | null>(null);
  const [reviewSearch, setReviewSearch] = useState('');
  const [filterOnlyNew, setFilterOnlyNew] = useState(false);
  const [importCompletedStats, setImportCompletedStats] = useState<{ addedCount: number; duplicateCount: number } | null>(null);

  const csvInputRef = useRef<HTMLInputElement>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Handle promo code submit
  const handleApplyPromo = (e: React.FormEvent) => {
    e.preventDefault();
    const res = unlockPro(promoCodeInput);
    setPromoFeedback(res);
    if (res.success) {
      setPromoCodeInput('');
      try {
        confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
      } catch (e) { }
    }
  };

  const handleSimulatedPurchase = () => {
    const res = unlockPro();
    setPromoFeedback(res);
    try {
      confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
    } catch (e) { }
  };

  // Convert raw list of words into review items with duplication detection
  const setupReviewList = (wordList: string[]) => {
    const existingKeys = new Set(Object.keys(words));
    const items: ParsedWordItem[] = wordList.map((w) => {
      const lower = w.toLowerCase();
      const isExisting = existingKeys.has(lower);
      return {
        word: lower,
        isExisting,
        selected: !isExisting, // Default check only new words
      };
    });

    if (items.length === 0) {
      setErrorNotice('No valid English words could be extracted. Please check your document format.');
      return;
    }

    setReviewItems(items);
    setErrorNotice(null);
  };

  // 1. Process Text Input
  const handleParseRawText = () => {
    if (!rawText.trim()) return;
    setIsParsing(true);
    try {
      const parsed = parseRawTextWords(rawText);
      setupReviewList(parsed);
    } catch (err: any) {
      setErrorNotice(`Text parsing failed: ${err.message}`);
    } finally {
      setIsParsing(false);
    }
  };

  // 2. Process CSV File
  const handleCsvFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsParsing(true);
    setErrorNotice(null);
    try {
      const parsed = await parseCsvFile(file);
      setupReviewList(parsed);
    } catch (err: any) {
      setErrorNotice(`CSV parsing error: ${err.message}`);
    } finally {
      setIsParsing(false);
      e.target.value = '';
    }
  };

  // 3. Process Excel File (Pro)
  const handleExcelFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsParsing(true);
    setErrorNotice(null);
    try {
      const parsed = await parseExcelFile(file);
      setupReviewList(parsed);
    } catch (err: any) {
      setErrorNotice(`Excel parsing error: ${err.message}`);
    } finally {
      setIsParsing(false);
      e.target.value = '';
    }
  };

  // 4. Process PDF Document (Pro)
  const handlePdfFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsParsing(true);
    setParseProgress(null);
    setErrorNotice(null);
    try {
      const parsed = await parsePdfFile(file, (page, total) => {
        setParseProgress({ page, total });
      });
      setupReviewList(parsed);
    } catch (err: any) {
      setErrorNotice(`PDF document extraction error: ${err.message}`);
    } finally {
      setIsParsing(false);
      setParseProgress(null);
      e.target.value = '';
    }
  };

  // Handle final import commitment to useSpellingStore
  const handleCommitImport = () => {
    if (!reviewItems) return;
    const selectedWords = reviewItems.filter((i) => i.selected).map((i) => i.word);
    if (selectedWords.length === 0) return;

    const res = addCustomWords(selectedWords);
    setImportCompletedStats(res);

    try {
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#F59E0B', '#10B981', '#3B82F6'],
      });
    } catch (e) { }
  };

  const handleResetModal = () => {
    setReviewItems(null);
    setImportCompletedStats(null);
    setRawText('');
    setErrorNotice(null);
  };

  // Selection toggles
  const handleToggleWord = (word: string) => {
    if (!reviewItems) return;
    setReviewItems(
      reviewItems.map((item) =>
        item.word === word ? { ...item, selected: !item.selected } : item
      )
    );
  };

  const handleSelectAll = (select: boolean) => {
    if (!reviewItems) return;
    setReviewItems(
      reviewItems.map((item) => ({ ...item, selected: select }))
    );
  };

  // Filtered review list for display
  const displayedReviewItems = (reviewItems || []).filter((item) => {
    if (filterOnlyNew && item.isExisting) return false;
    if (reviewSearch.trim()) {
      return item.word.includes(reviewSearch.trim().toLowerCase());
    }
    return true;
  });

  const selectedCount = (reviewItems || []).filter((i) => i.selected).length;
  const newCount = (reviewItems || []).filter((i) => !i.isExisting).length;
  const existingCount = (reviewItems || []).filter((i) => i.isExisting).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div
        className="w-full max-w-3xl bg-white dark:bg-warm-900 rounded-3xl shadow-2xl border border-warm-200 dark:border-warm-800 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-warm-50 via-warm-100 to-warm-50 dark:from-warm-900 dark:via-warm-850 dark:to-warm-900 border-b border-warm-200 dark:border-warm-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500 text-white shadow-md shadow-amber-500/20">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold font-serif text-warm-900 dark:text-warm-50">
                  Custom Word Ingestion Hub
                </h3>
                {isProUnlocked ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                    <Sparkles className="w-3 h-3 text-amber-500 fill-amber-500" />
                    Pro Unlocked
                  </span>
                ) : (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-warm-200 dark:bg-warm-800 text-warm-700 dark:text-warm-300">
                    Free Tier
                  </span>
                )}
              </div>
              <p className="text-xs text-warm-500 dark:text-warm-400">
                Import and merge school, regional, or custom spelling wordlists into your practice engine.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-warm-400 hover:text-warm-600 dark:hover:text-warm-200 hover:bg-warm-100 dark:hover:bg-warm-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm text-warm-800 dark:text-warm-200">
          {/* Error Notice */}
          {errorNotice && (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl flex items-center gap-2 text-xs text-rose-800 dark:text-rose-300">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorNotice}</span>
            </div>
          )}

          {/* SCREEN 1: UPLOAD / INGESTION TABS */}
          {!reviewItems && !importCompletedStats && (
            <div className="space-y-6">
              {/* Tab Selector */}
              <div className="flex items-center gap-2 border-b border-warm-200 dark:border-warm-800 pb-3">
                <button
                  onClick={() => setActiveTab('text_csv')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'text_csv'
                      ? 'bg-amber-500 text-white shadow-sm'
                      : 'text-warm-600 dark:text-warm-300 hover:bg-warm-100 dark:hover:bg-warm-800'
                    }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>Raw Text / CSV (Free)</span>
                </button>

                <button
                  onClick={() => setActiveTab('excel')}
                  className={`relative flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'excel'
                      ? 'bg-amber-500 text-white shadow-sm'
                      : 'text-warm-600 dark:text-warm-300 hover:bg-warm-100 dark:hover:bg-warm-800'
                    }`}
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Excel (.xlsx)</span>
                  {!isProUnlocked && (
                    <span className="p-0.5 rounded-full bg-amber-400/20 text-amber-600 dark:text-amber-400">
                      <Lock className="w-3 h-3" />
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setActiveTab('pdf')}
                  className={`relative flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'pdf'
                      ? 'bg-amber-500 text-white shadow-sm'
                      : 'text-warm-600 dark:text-warm-300 hover:bg-warm-100 dark:hover:bg-warm-800'
                    }`}
                >
                  <FileCheck2 className="w-4 h-4" />
                  <span>PDF Document</span>
                  {!isProUnlocked && (
                    <span className="p-0.5 rounded-full bg-amber-400/20 text-amber-600 dark:text-amber-400">
                      <Lock className="w-3 h-3" />
                    </span>
                  )}
                </button>
              </div>

              {/* TAB 1: RAW TEXT / CSV (FREE) */}
              {activeTab === 'text_csv' && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-warm-600 dark:text-warm-300 block">
                      Paste Words (one per line, comma or space separated):
                    </label>
                    <textarea
                      value={rawText}
                      onChange={(e) => setRawText(e.target.value)}
                      placeholder="e.g.&#10;chiaroscurist&#10;bourgeoning&#10;paraphernalia&#10;quintessential"
                      rows={5}
                      className="w-full p-3.5 rounded-2xl bg-warm-50 dark:bg-warm-850 border border-warm-200 dark:border-warm-700 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono text-xs placeholder:text-warm-400"
                    />
                    <div className="flex justify-between items-center text-xs">
                      <button
                        type="button"
                        onClick={() =>
                          setRawText('chiaroscurist\nbourgeoning\nparaphernalia\nquintessential\nsycophant\nsurveillance')
                        }
                        className="text-amber-600 dark:text-amber-400 hover:underline"
                      >
                        Paste 6 Sample Words
                      </button>
                      <button
                        type="button"
                        onClick={handleParseRawText}
                        disabled={!rawText.trim() || isParsing}
                        className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold text-xs shadow-sm transition-all flex items-center gap-1.5"
                      >
                        {isParsing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
                        <span>Parse Text Words</span>
                      </button>
                    </div>
                  </div>

                  <div className="relative flex py-2 items-center">
                    <div className="flex-grow border-t border-warm-200 dark:border-warm-800"></div>
                    <span className="flex-shrink mx-4 text-xs font-medium text-warm-400">OR UPLOAD CSV</span>
                    <div className="flex-grow border-t border-warm-200 dark:border-warm-800"></div>
                  </div>

                  {/* CSV File Dropzone */}
                  <div
                    onClick={() => csvInputRef.current?.click()}
                    className="border-2 border-dashed border-warm-300 dark:border-warm-700 hover:border-amber-500 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-warm-50/50 dark:bg-warm-850/50 group"
                  >
                    <Upload className="w-8 h-8 text-warm-400 group-hover:text-amber-500 mx-auto mb-2 transition-colors" />
                    <span className="font-semibold text-xs text-warm-800 dark:text-warm-100 block">
                      Click to choose or drop a .csv file
                    </span>
                    <span className="text-[11px] text-warm-500 dark:text-warm-400">
                      Standard comma-separated word lists
                    </span>
                    <input
                      ref={csvInputRef}
                      type="file"
                      accept=".csv,.txt"
                      onChange={handleCsvFileUpload}
                      className="hidden"
                    />
                  </div>
                </div>
              )}

              {/* TAB 2: EXCEL (.XLSX) */}
              {activeTab === 'excel' && (
                <div className="space-y-4 animate-fadeIn">
                  {isProUnlocked ? (
                    <div className="space-y-4">
                      <div
                        onClick={() => excelInputRef.current?.click()}
                        className="border-2 border-dashed border-amber-300 dark:border-amber-700 hover:border-amber-500 rounded-2xl p-8 text-center cursor-pointer transition-colors bg-amber-50/30 dark:bg-amber-950/20 group"
                      >
                        {isParsing ? (
                          <div className="space-y-2">
                            <Loader2 className="w-8 h-8 text-amber-500 animate-spin mx-auto" />
                            <span className="font-semibold text-xs text-warm-800 dark:text-warm-100 block">
                              Extracting workbook columns & sheets...
                            </span>
                          </div>
                        ) : (
                          <>
                            <FileSpreadsheet className="w-10 h-10 text-amber-500 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                            <span className="font-bold text-sm text-warm-900 dark:text-warm-50 block">
                              Drop your Excel Workbook (.xlsx / .xls)
                            </span>
                            <span className="text-xs text-warm-500 dark:text-warm-400 mt-1 block">
                              Auto-detects spelling words across columns and sheets.
                            </span>
                          </>
                        )}
                        <input
                          ref={excelInputRef}
                          type="file"
                          accept=".xlsx,.xls"
                          onChange={handleExcelFileUpload}
                          className="hidden"
                        />
                      </div>
                    </div>
                  ) : (
                    /* Locked Pro Gate for Excel */
                    <div className="p-6 rounded-3xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-200 dark:border-amber-800 text-center space-y-4">
                      <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center mx-auto shadow-md">
                        <Lock className="w-6 h-6" />
                      </div>
                      <div className="space-y-1">
                        <span className="inline-block text-[10px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300">
                          Spellbean Pro • Lifetime Feature
                        </span>
                        <h4 className="text-lg font-bold font-serif text-warm-900 dark:text-warm-50">
                          Excel (.xlsx / .xls) Wordbook Ingestion
                        </h4>
                        <p className="text-xs text-warm-600 dark:text-warm-300 max-w-md mx-auto">
                          Import full school spelling rosters and regional multi-sheet workbooks directly into your daily trainer.
                        </p>
                      </div>

                      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                        <a
                          href="https://pm.link/org-gaeypCEUR9YGrVTZSG6ejSZd/H69lMME"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-md shadow-amber-500/25 transition-all flex items-center justify-center gap-2"
                        >
                          <Sparkles className="w-4 h-4 fill-current" />
                          <span>Unlock Lifetime Access — ₱399 (GCash / Maya / Card)</span>
                        </a>
                      </div>

                      {/* Promo Code Form */}
                      <form onSubmit={handleApplyPromo} className="pt-2 max-w-sm mx-auto flex items-center gap-2">
                        <input
                          type="text"
                          value={promoCodeInput}
                          onChange={(e) => setPromoCodeInput(e.target.value)}
                          placeholder="Enter promo code"
                          className="flex-1 px-3 py-2 text-xs bg-white dark:bg-warm-850 border border-warm-200 dark:border-warm-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                        />
                        <button
                          type="submit"
                          className="px-3 py-2 bg-warm-200 dark:bg-warm-800 hover:bg-warm-300 text-warm-800 dark:text-warm-100 text-xs font-bold rounded-xl transition-colors"
                        >
                          Activate
                        </button>
                      </form>
                      {promoFeedback && (
                        <p
                          className={`text-xs font-semibold ${promoFeedback.success ? 'text-emerald-600' : 'text-rose-600'
                            }`}
                        >
                          {promoFeedback.message}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: PDF DOCUMENT PARSER (PRO) */}
              {activeTab === 'pdf' && (
                <div className="space-y-4 animate-fadeIn">
                  {isProUnlocked ? (
                    <div className="space-y-4">
                      <div
                        onClick={() => pdfInputRef.current?.click()}
                        className="border-2 border-dashed border-amber-300 dark:border-amber-700 hover:border-amber-500 rounded-2xl p-8 text-center cursor-pointer transition-colors bg-amber-50/30 dark:bg-amber-950/20 group"
                      >
                        {isParsing ? (
                          <div className="space-y-2">
                            <Loader2 className="w-8 h-8 text-amber-500 animate-spin mx-auto" />
                            <span className="font-semibold text-xs text-warm-800 dark:text-warm-100 block">
                              Extracting text from PDF document...
                            </span>
                            {parseProgress && (
                              <span className="text-[11px] text-amber-600 dark:text-amber-400 font-mono">
                                Page {parseProgress.page} of {parseProgress.total}
                              </span>
                            )}
                          </div>
                        ) : (
                          <>
                            <FileCheck2 className="w-10 h-10 text-amber-500 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                            <span className="font-bold text-sm text-warm-900 dark:text-warm-50 block">
                              Drop your PDF Wordlist or Guidelines Document
                            </span>
                            <span className="text-xs text-warm-500 dark:text-warm-400 mt-1 block">
                              Parses 100% client-side with smart token isolation & noise filtration.
                            </span>
                          </>
                        )}
                        <input
                          ref={pdfInputRef}
                          type="file"
                          accept=".pdf"
                          onChange={handlePdfFileUpload}
                          className="hidden"
                        />
                      </div>
                    </div>
                  ) : (
                    /* Locked Pro Gate for PDF */
                    <div className="p-6 rounded-3xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-200 dark:border-amber-800 text-center space-y-4">
                      <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center mx-auto shadow-md">
                        <Lock className="w-6 h-6" />
                      </div>
                      <div className="space-y-1">
                        <span className="inline-block text-[10px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300">
                          Spellbean Pro • Lifetime Feature
                        </span>
                        <h4 className="text-lg font-bold font-serif text-warm-900 dark:text-warm-50">
                          Client-Side PDF Document Parser
                        </h4>
                        <p className="text-xs text-warm-600 dark:text-warm-300 max-w-md mx-auto">
                          Extract clean spelling competition words directly from convention manuals, study booklets, and PDF printouts without server uploads.
                        </p>
                      </div>

                      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                        <a
                          href="https://pm.link/org-gaeypCEUR9YGrVTZSG6ejSZd/H69lMME"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-md shadow-amber-500/25 transition-all flex items-center justify-center gap-2"
                        >
                          <Sparkles className="w-4 h-4 fill-current" />
                          <span>Unlock Lifetime Access — ₱399 (GCash / Maya / Card)</span>
                        </a>
                      </div>

                      {/* Promo Code Form */}
                      <form onSubmit={handleApplyPromo} className="pt-2 max-w-sm mx-auto flex items-center gap-2">
                        <input
                          type="text"
                          value={promoCodeInput}
                          onChange={(e) => setPromoCodeInput(e.target.value)}
                          placeholder="Enter promo code"
                          className="flex-1 px-3 py-2 text-xs bg-white dark:bg-warm-850 border border-warm-200 dark:border-warm-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                        />
                        <button
                          type="submit"
                          className="px-3 py-2 bg-warm-200 dark:bg-warm-800 hover:bg-warm-300 text-warm-800 dark:text-warm-100 text-xs font-bold rounded-xl transition-colors"
                        >
                          Activate
                        </button>
                      </form>
                      {promoFeedback && (
                        <p
                          className={`text-xs font-semibold ${promoFeedback.success ? 'text-emerald-600' : 'text-rose-600'
                            }`}
                        >
                          {promoFeedback.message}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* SCREEN 2: REVIEW & DEDUPLICATION PREVIEW */}
          {reviewItems && !importCompletedStats && (
            <div className="space-y-4 animate-fadeIn">
              {/* Summary Header */}
              <div className="p-4 bg-warm-50 dark:bg-warm-850 rounded-2xl border border-warm-200 dark:border-warm-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="font-serif font-bold text-base text-warm-900 dark:text-warm-50 block">
                    Found {reviewItems.length} Valid Words
                  </span>
                  <div className="flex items-center gap-2 text-xs text-warm-500 dark:text-warm-400 mt-0.5">
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                      +{newCount} New
                    </span>
                    <span>•</span>
                    <span className="text-warm-500">
                      {existingCount} Already in Bank
                    </span>
                    <span>•</span>
                    <span className="font-bold text-amber-600 dark:text-amber-400">
                      {selectedCount} Selected
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleSelectAll(true)}
                    className="px-2.5 py-1 text-xs font-semibold bg-warm-200 dark:bg-warm-800 hover:bg-warm-300 rounded-lg text-warm-800 dark:text-warm-100"
                  >
                    Select All
                  </button>
                  <button
                    onClick={() => handleSelectAll(false)}
                    className="px-2.5 py-1 text-xs font-semibold bg-warm-200 dark:bg-warm-800 hover:bg-warm-300 rounded-lg text-warm-800 dark:text-warm-100"
                  >
                    Deselect All
                  </button>
                  <button
                    onClick={handleResetModal}
                    className="px-2.5 py-1 text-xs font-semibold text-warm-500 hover:text-warm-800"
                  >
                    Reset
                  </button>
                </div>
              </div>

              {/* Search & Filter row */}
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-warm-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={reviewSearch}
                    onChange={(e) => setReviewSearch(e.target.value)}
                    placeholder="Search extracted words..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-warm-50 dark:bg-warm-850 border border-warm-200 dark:border-warm-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <label className="flex items-center gap-1.5 text-xs text-warm-600 dark:text-warm-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={filterOnlyNew}
                    onChange={(e) => setFilterOnlyNew(e.target.checked)}
                    className="w-3.5 h-3.5 rounded text-amber-500 focus:ring-amber-500"
                  />
                  <span>Show Only New Words</span>
                </label>
              </div>

              {/* Items List */}
              <div className="max-h-72 overflow-y-auto border border-warm-200 dark:border-warm-800 rounded-2xl divide-y divide-warm-100 dark:divide-warm-800">
                {displayedReviewItems.map((item) => (
                  <div
                    key={item.word}
                    onClick={() => handleToggleWord(item.word)}
                    className="p-3 flex items-center justify-between hover:bg-warm-50 dark:hover:bg-warm-850/60 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={item.selected}
                        onChange={() => { }} // Handled by parent click
                        className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 cursor-pointer"
                      />
                      <span className="font-mono text-sm font-semibold text-warm-900 dark:text-warm-100">
                        {item.word}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {item.isExisting ? (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-warm-100 dark:bg-warm-800 text-warm-500">
                          Already In Bank
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                          New Word
                        </span>
                      )}
                      <span className="text-xs text-warm-400 font-mono">
                        {item.word.length} letters
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add to Bank Button */}
              <div className="pt-2 flex items-center justify-between">
                <button
                  onClick={handleResetModal}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-warm-600 dark:text-warm-400 hover:text-warm-900"
                >
                  Cancel & Pick Another File
                </button>
                <button
                  onClick={handleCommitImport}
                  disabled={selectedCount === 0}
                  className="px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white font-bold text-xs shadow-md shadow-amber-500/20 transition-all flex items-center gap-2"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Add {selectedCount} Words to Bank</span>
                </button>
              </div>
            </div>
          )}

          {/* SCREEN 3: IMPORT SUCCESS FEEDBACK */}
          {importCompletedStats && (
            <div className="py-8 text-center space-y-4 animate-fadeIn">
              <div className="w-16 h-16 rounded-3xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h4 className="text-2xl font-bold font-serif text-warm-900 dark:text-warm-50">
                  Import Successfully Processed!
                </h4>
                <p className="text-xs sm:text-sm text-warm-600 dark:text-warm-300">
                  Added <strong>{importCompletedStats.addedCount}</strong> new words into your spelling bank.
                  {importCompletedStats.duplicateCount > 0 && (
                    <span> ({importCompletedStats.duplicateCount} duplicates safely preserved).</span>
                  )}
                </p>
                <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium pt-1">
                  Daily Quota & Exhaustion Engine updated automatically.
                </p>
              </div>

              <div className="pt-4 flex items-center justify-center gap-3">
                <button
                  onClick={handleResetModal}
                  className="px-5 py-2.5 rounded-xl bg-warm-100 dark:bg-warm-800 hover:bg-warm-200 text-warm-800 dark:text-warm-100 text-xs font-semibold transition-colors"
                >
                  Import Another File
                </button>
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-md transition-colors"
                >
                  Done & Back to Study
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

