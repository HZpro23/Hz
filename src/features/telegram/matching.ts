import { normalizeText, textScore } from "@/lib/text-match";
import type { ProductForVoiceMatching } from "@/features/telegram/queries";

/**
 * Matches a spoken/transcribed product name against real `Product` rows.
 * Reuses the fuzzy text scorer already built for the AI purchase-invoice
 * scanner (`src/features/purchases/matching.ts::textScore`/`normalizeText`)
 * instead of re-implementing similarity scoring — same tiers, same
 * thresholds, applied to a name-only match since voice never carries a
 * SKU/barcode.
 */

export type VoiceMatchStatus = "EXACT" | "STRONG" | "AMBIGUOUS" | "NOT_FOUND";

export type VoiceMatchCandidate = {
  productId: string;
  name: string;
  score: number;
};

export type VoiceMatch = {
  status: VoiceMatchStatus;
  matchedProductId: string | null;
  candidates: VoiceMatchCandidate[];
};

const STRONG_SCORE = 0.8;
const STRONG_LEAD = 0.12;
const REVIEW_FLOOR = 0.3;
const MAX_CANDIDATES = 5;

type IndexedProduct = ProductForVoiceMatching & { _text: string };

export function indexProductsForVoice(
  products: ProductForVoiceMatching[],
): IndexedProduct[] {
  return products.map((product) => ({
    ...product,
    _text: normalizeText(`${product.name} ${product.description ?? ""}`),
  }));
}

export function matchSpokenProduct(
  spokenName: string,
  indexed: IndexedProduct[],
): VoiceMatch {
  const query = normalizeText(spokenName);
  if (!query) return { status: "NOT_FOUND", matchedProductId: null, candidates: [] };

  const scored = indexed
    .map((product) => ({ product, score: textScore(query, product._text) }))
    .filter((entry) => entry.score >= REVIEW_FLOOR)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) {
    return { status: "NOT_FOUND", matchedProductId: null, candidates: [] };
  }

  const candidates = scored.slice(0, MAX_CANDIDATES).map((entry) => ({
    productId: entry.product.id,
    name: entry.product.name,
    score: Math.round(entry.score * 100) / 100,
  }));

  const best = scored[0];
  const second = scored[1];
  const clearLead = !second || best.score - second.score >= STRONG_LEAD;

  if (best.score === 1) {
    // Sound-alike folding can make different products tie at 1 ("طين" vs
    // "تين"); only call it EXACT when the tied entries are the same product
    // name, otherwise let the user pick.
    const tied = scored.filter((entry) => entry.score === 1);
    const sameName = tied.every(
      (entry) => entry.product.name.trim() === best.product.name.trim(),
    );
    if (sameName) {
      return { status: "EXACT", matchedProductId: best.product.id, candidates };
    }
    return { status: "AMBIGUOUS", matchedProductId: null, candidates };
  }
  if (best.score >= STRONG_SCORE && clearLead) {
    return { status: "STRONG", matchedProductId: best.product.id, candidates };
  }
  return { status: "AMBIGUOUS", matchedProductId: null, candidates };
}

/**
 * Picks the catalog names most similar to what was said, so an LLM prompt can
 * list a handful of real candidates instead of the whole catalog (hundreds of
 * products would blow past a small model's token budget). Scores every 1-3
 * word phrase of the message against each product name; pure text similarity,
 * no ids or prices involved.
 */
export function shortlistProductNames(
  message: string,
  indexed: IndexedProduct[],
  limit = 40,
): string[] {
  const words = normalizeText(message)
    .split(" ")
    .filter((w) => w.length >= 2 && !/^\d+$/.test(w));
  const phrases = new Set<string>();
  for (let size = 1; size <= 3; size++) {
    for (let i = 0; i + size <= words.length; i++) {
      phrases.add(words.slice(i, i + size).join(" "));
    }
  }
  if (phrases.size === 0) return [];

  return indexed
    .map((product) => {
      let best = 0;
      for (const phrase of phrases) {
        best = Math.max(best, textScore(phrase, product._text));
      }
      return { name: product.name.trim(), score: best };
    })
    .filter((entry) => entry.score >= 0.3)
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.name)
    .filter((name, index, all) => all.indexOf(name) === index)
    .slice(0, limit);
}
