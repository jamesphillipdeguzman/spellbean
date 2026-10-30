export type DiffCharType = 'match' | 'extra' | 'missing' | 'substitution' | 'transposition';

export interface DiffPart {
  type: DiffCharType;
  inputChar?: string;
  expectedChar?: string;
  index: number;
}

export interface CharacterDiffResult {
  isMatch: boolean;
  expected: string;
  input: string;
  parts: DiffPart[];
  userAnnotated: { char: string; type: DiffCharType }[];
  expectedAnnotated: { char: string; type: DiffCharType }[];
  summary: {
    missingCount: number;
    extraCount: number;
    substitutionCount: number;
    transpositionCount: number;
  };
}

/**
 * Computes a detailed character diff between user's input and official spelling.
 * Highlights:
 * - Green for correct characters
 * - Red strike for extra/wrong characters
 * - Yellow/Amber for missing characters
 * - Purple/Blue for transpositions (e.g. ie vs ei)
 */
export function computeCharacterDiff(inputRaw: string, expectedRaw: string): CharacterDiffResult {
  const input = inputRaw.trim().toLowerCase();
  const expected = expectedRaw.trim().toLowerCase();

  if (input === expected) {
    return {
      isMatch: true,
      expected: expectedRaw,
      input: inputRaw,
      parts: expected.split('').map((char, index) => ({
        type: 'match',
        inputChar: char,
        expectedChar: char,
        index,
      })),
      userAnnotated: inputRaw.split('').map((char) => ({ char, type: 'match' })),
      expectedAnnotated: expectedRaw.split('').map((char) => ({ char, type: 'match' })),
      summary: { missingCount: 0, extraCount: 0, substitutionCount: 0, transpositionCount: 0 },
    };
  }

  // Need sequence alignment (Needleman-Wunsch / Levenshtein alignment)
  const m = input.length;
  const n = expected.length;

  // dp matrix for costs
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i * 2; // deletion cost
  for (let j = 0; j <= n; j++) dp[0][j] = j * 2; // insertion cost

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (input[i - 1] === expected[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1]; // match
      } else {
        const subCost = 2;
        const delCost = 2;
        const insCost = 2;
        dp[i][j] = Math.min(
          dp[i - 1][j - 1] + subCost,
          dp[i - 1][j] + delCost,
          dp[i][j - 1] + insCost
        );
      }
    }
  }

  // Backtrack to build aligned tokens
  let i = m;
  let j = n;
  const alignedInput: (string | null)[] = [];
  const alignedExpected: (string | null)[] = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && input[i - 1] === expected[j - 1]) {
      alignedInput.unshift(inputRaw[i - 1]);
      alignedExpected.unshift(expectedRaw[j - 1]);
      i--;
      j--;
    } else {
      const matchSub = i > 0 && j > 0 ? dp[i - 1][j - 1] : Infinity;
      const matchDel = i > 0 ? dp[i - 1][j] : Infinity;
      const matchIns = j > 0 ? dp[i][j - 1] : Infinity;

      if (matchSub <= matchDel && matchSub <= matchIns && i > 0 && j > 0) {
        alignedInput.unshift(inputRaw[i - 1]);
        alignedExpected.unshift(expectedRaw[j - 1]);
        i--;
        j--;
      } else if (matchDel <= matchIns && i > 0) {
        alignedInput.unshift(inputRaw[i - 1]);
        alignedExpected.unshift(null); // extra in input
        i--;
      } else {
        alignedInput.unshift(null); // missing in input
        alignedExpected.unshift(expectedRaw[j - 1]);
        j--;
      }
    }
  }

  // Identify transpositions (e.g. alignedInput: [i, e], alignedExpected: [e, i])
  const parts: DiffPart[] = [];
  let missingCount = 0;
  let extraCount = 0;
  let substitutionCount = 0;
  let transpositionCount = 0;

  for (let k = 0; k < alignedInput.length; k++) {
    const inC = alignedInput[k];
    const expC = alignedExpected[k];

    // Check transposition with adjacent slot
    if (
      k + 1 < alignedInput.length &&
      inC !== null &&
      expC !== null &&
      alignedInput[k + 1] !== null &&
      alignedExpected[k + 1] !== null &&
      inC.toLowerCase() === alignedExpected[k + 1]!.toLowerCase() &&
      alignedInput[k + 1]!.toLowerCase() === expC.toLowerCase()
    ) {
      parts.push({
        type: 'transposition',
        inputChar: inC,
        expectedChar: expC,
        index: k,
      });
      parts.push({
        type: 'transposition',
        inputChar: alignedInput[k + 1]!,
        expectedChar: alignedExpected[k + 1]!,
        index: k + 1,
      });
      transpositionCount += 2;
      k++; // skip next since handled
      continue;
    }

    if (inC === null) {
      parts.push({
        type: 'missing',
        expectedChar: expC || undefined,
        index: k,
      });
      missingCount++;
    } else if (expC === null) {
      parts.push({
        type: 'extra',
        inputChar: inC,
        index: k,
      });
      extraCount++;
    } else if (inC.toLowerCase() === expC.toLowerCase()) {
      parts.push({
        type: 'match',
        inputChar: inC,
        expectedChar: expC,
        index: k,
      });
    } else {
      parts.push({
        type: 'substitution',
        inputChar: inC,
        expectedChar: expC,
        index: k,
      });
      substitutionCount++;
    }
  }

  // Build clean visual annotations
  const userAnnotated: { char: string; type: DiffCharType }[] = [];
  const expectedAnnotated: { char: string; type: DiffCharType }[] = [];

  for (const p of parts) {
    if (p.type === 'match') {
      userAnnotated.push({ char: p.inputChar!, type: 'match' });
      expectedAnnotated.push({ char: p.expectedChar!, type: 'match' });
    } else if (p.type === 'transposition') {
      userAnnotated.push({ char: p.inputChar!, type: 'transposition' });
      expectedAnnotated.push({ char: p.expectedChar!, type: 'transposition' });
    } else if (p.type === 'substitution') {
      userAnnotated.push({ char: p.inputChar!, type: 'substitution' });
      expectedAnnotated.push({ char: p.expectedChar!, type: 'substitution' });
    } else if (p.type === 'extra') {
      userAnnotated.push({ char: p.inputChar!, type: 'extra' });
    } else if (p.type === 'missing') {
      expectedAnnotated.push({ char: p.expectedChar!, type: 'missing' });
    }
  }

  return {
    isMatch: false,
    expected: expectedRaw,
    input: inputRaw,
    parts,
    userAnnotated,
    expectedAnnotated,
    summary: {
      missingCount,
      extraCount,
      substitutionCount,
      transpositionCount,
    },
  };
}
