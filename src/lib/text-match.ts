import { normalizeArabicName } from "@/lib/arabic-name";

/** Letters that sound alike in Arabic/Darija speech and are routinely mixed
 * up by speech-to-text and by spelling ("كريستال" vs "كريسطال"). Folded only
 * for comparing — never shown — so the two spellings score as the same word. */
const SOUND_ALIKE: [RegExp, string][] = [
  [/ط/g, "ت"],
  [/ص/g, "س"],
  [/ض/g, "د"],
  [/[ظذ]/g, "ز"],
  [/ة/g, "ه"],
  [/ؤ/g, "و"],
  [/ئ/g, "ي"],
  [/ء/g, ""],
];

/** Free text (product names/descriptions), AR/FR/EN. */
export function normalizeText(value: string | null | undefined): string {
  if (!value) return "";
  const latinFolded = value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
  let text = normalizeArabicName(latinFolded)
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  for (const [pattern, replacement] of SOUND_ALIKE) {
    text = text.replace(pattern, replacement);
  }
  // Drop the Arabic definite article ("الماء" -> "ماء") from longer words.
  return text
    .split(" ")
    .map((token) =>
      token.length > 3 && token.startsWith("ال") ? token.slice(2) : token,
    )
    .join(" ");
}

function bigrams(value: string): Map<string, number> {
  const grams = new Map<string, number>();
  const compact = value.replace(/\s+/g, "");
  for (let i = 0; i < compact.length - 1; i++) {
    const g = compact.slice(i, i + 2);
    grams.set(g, (grams.get(g) ?? 0) + 1);
  }
  return grams;
}

function diceCoefficient(a: string, b: string): number {
  if (a === b) return a.length > 0 ? 1 : 0;
  if (a.length < 2 || b.length < 2) return 0;
  const gramsA = bigrams(a);
  const gramsB = bigrams(b);
  let overlap = 0;
  let totalA = 0;
  for (const count of gramsA.values()) totalA += count;
  let totalB = 0;
  for (const count of gramsB.values()) totalB += count;
  for (const [gram, countA] of gramsA) {
    const countB = gramsB.get(gram);
    if (countB) overlap += Math.min(countA, countB);
  }
  return (2 * overlap) / (totalA + totalB);
}

function fuzzyTokenOverlap(a: string, b: string): number {
  const tokensA = a.split(" ").filter(Boolean);
  const tokensB = b.split(" ").filter(Boolean);
  if (tokensA.length === 0 || tokensB.length === 0) return 0;

  const [small, large] =
    tokensA.length <= tokensB.length ? [tokensA, tokensB] : [tokensB, tokensA];
  const used = new Set<number>();
  let matched = 0;
  for (const token of small) {
    let bestIndex = -1;
    let bestScore = 0;
    for (let i = 0; i < large.length; i++) {
      if (used.has(i)) continue;
      const s = token === large[i] ? 1 : diceCoefficient(token, large[i]);
      if (s > bestScore) {
        bestScore = s;
        bestIndex = i;
      }
    }
    if (bestIndex !== -1 && bestScore >= 0.5) {
      used.add(bestIndex);
      matched += bestScore;
    }
  }
  return matched / Math.max(tokensA.length, tokensB.length);
}

/** 0..1 similarity between two already-normalized text strings. */
export function textScore(a: string, b: string): number {
  if (!a || !b) return 0;
  const compactA = a.replace(/\s+/g, "");
  const compactB = b.replace(/\s+/g, "");
  if (compactA === compactB) return 1;

  const dice = diceCoefficient(a, b);
  const tokenOverlap = fuzzyTokenOverlap(a, b);
  let score = 0.5 * dice + 0.5 * tokenOverlap;

  const keep = (w: string) => w.length >= 2 || /\d/.test(w);
  const wordsA = a.split(" ").filter(keep);
  const wordsB = b.split(" ").filter(keep);
  const [fewer, more] =
    wordsA.length <= wordsB.length ? [wordsA, wordsB] : [wordsB, wordsA];
  if (fewer.length > 0 && fewer.every((w) => more.includes(w))) {
    score = Math.max(score, 0.85);
  }

  const [shortWords, longWords] = a.length <= b.length ? [a, b] : [b, a];
  if (shortWords.length >= 4 && longWords.includes(shortWords)) {
    score = Math.max(score, 0.85);
  }
  const [shortCompact, longCompact] =
    compactA.length <= compactB.length
      ? [compactA, compactB]
      : [compactB, compactA];
  if (shortCompact.length >= 6 && longCompact.includes(shortCompact)) {
    score = Math.max(score, 0.9);
  }
  return Math.min(1, score);
}
