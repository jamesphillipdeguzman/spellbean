import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
}

/**
 * Cleans and validates a token into a legitimate spelling word.
 * Returns null if the token is a page number, symbol, or noise.
 */
export function sanitizeWordToken(token: string): string | null {
  if (!token) return null;
  // Remove leading/trailing non-alphabetic chars except legitimate apostrophes/hyphens
  let cleaned = token.trim().replace(/^[^a-zA-Z]+|[^a-zA-Z]+$/g, '').toLowerCase();

  // Must contain only letters, hyphens, or apostrophes
  if (!/^[a-z]+([-'’][a-z]+)*$/.test(cleaned)) {
    return null;
  }

  // Minimum length 2 characters
  if (cleaned.length < 2) {
    return null;
  }

  return cleaned;
}

/**
 * Parse raw text (one per line, spaces, commas, or semicolons)
 */
export function parseRawTextWords(text: string): string[] {
  const wordsSet = new Set<string>();
  const tokens = text.split(/[\r\n,;]+/);

  for (const raw of tokens) {
    const clean = sanitizeWordToken(raw);
    if (clean) {
      wordsSet.add(clean);
    }
  }

  return Array.from(wordsSet);
}

/**
 * Parse CSV file using PapaParse
 */
export async function parseCsvFile(file: File): Promise<string[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      skipEmptyLines: true,
      complete: (results) => {
        const wordsSet = new Set<string>();
        if (Array.isArray(results.data)) {
          for (const row of results.data as any[]) {
            if (Array.isArray(row)) {
              for (const cell of row) {
                if (typeof cell === 'string') {
                  // If cell contains commas or space separated tokens
                  const tokens = cell.split(/[\s,;]+/);
                  for (const t of tokens) {
                    const clean = sanitizeWordToken(t);
                    if (clean) wordsSet.add(clean);
                  }
                }
              }
            }
          }
        }
        resolve(Array.from(wordsSet));
      },
      error: (err) => reject(err),
    });
  });
}

/**
 * Parse Excel (.xlsx / .xls) file using SheetJS (xlsx)
 */
export async function parseExcelFile(file: File): Promise<string[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const wordsSet = new Set<string>();

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const data: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    for (const row of data) {
      if (Array.isArray(row)) {
        for (const cell of row) {
          if (cell !== undefined && cell !== null) {
            const strVal = String(cell);
            const tokens = strVal.split(/[\s,;]+/);
            for (const t of tokens) {
              const clean = sanitizeWordToken(t);
              if (clean) wordsSet.add(clean);
            }
          }
        }
      }
    }
  }

  return Array.from(wordsSet);
}

/**
 * Parse PDF document client-side using pdfjs-dist
 */
export async function parsePdfFile(file: File, onProgress?: (page: number, total: number) => void): Promise<string[]> {
  const buffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages;
  const wordsSet = new Set<string>();

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    onProgress?.(pageNum, numPages);
    const page = await pdfDoc.getPage(pageNum);
    const textContent = await page.getTextContent();

    for (const item of textContent.items as any[]) {
      if (item && item.str) {
        const line = item.str;
        const tokens = line.split(/[\s,;:()[\]{}<>"“”'’/\\|0-9]+/);
        for (const t of tokens) {
          const clean = sanitizeWordToken(t);
          if (clean) {
            wordsSet.add(clean);
          }
        }
      }
    }
  }

  return Array.from(wordsSet);
}
