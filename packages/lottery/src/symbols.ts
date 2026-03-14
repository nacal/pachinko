import type {
  DrawOutcome,
  ReelResult,
  Rng,
  SymbolSpec,
  SymbolTable,
} from "./types";
import { weightedSelect } from "./lottery";

/**
 * Generate reel results (3 reels: left, center, right).
 *
 * - oatari/koatari: all 3 reels show the same symbol
 * - hazure + reach: left and right match, center differs
 * - hazure + no reach: all 3 differ (best effort)
 */
export function drawReels(
  symbols: SymbolTable,
  outcome: DrawOutcome,
  rng: Rng,
  options?: { reach?: boolean },
): ReelResult {
  if (outcome === "oatari" || outcome === "koatari") {
    // Jackpot: 3 of a kind
    const symbol = weightedSelect(symbols.oatariSymbols, rng);
    return { left: symbol, center: symbol, right: symbol };
  }

  const isReach = options?.reach ?? false;
  const allSymbols = symbols.allSymbols;

  if (allSymbols.length < 2) {
    // Not enough symbols for variation
    const s = allSymbols[0]!;
    return { left: s, center: s, right: s };
  }

  if (isReach) {
    // Reach: left and right match, center differs
    const matchSymbol = pickRandom(allSymbols, rng);
    const others = allSymbols.filter((s) => s.id !== matchSymbol.id);
    const centerSymbol =
      others.length > 0 ? pickRandom(others, rng) : matchSymbol;
    return { left: matchSymbol, center: centerSymbol, right: matchSymbol };
  }

  // Normal hazure: try to make all 3 different
  const left = pickRandom(allSymbols, rng);
  const center = pickRandomExcluding(allSymbols, [left.id], rng);
  // Right must differ from left (to avoid accidental reach)
  const right = pickRandomExcluding(allSymbols, [left.id], rng);

  return { left, center, right };
}

/**
 * Create a standard symbol set from string labels.
 */
export function standardSymbolSet(
  labels: string[],
  kakuhenLabels?: string[],
): SymbolTable {
  const kakuhenSet = new Set(kakuhenLabels ?? []);
  const allSymbols: SymbolSpec[] = labels.map((label) => ({
    id: label,
    label,
    isKakuhen: kakuhenSet.has(label),
  }));

  const oatariSymbols = allSymbols.map((s) => ({
    value: s,
    weight: 1,
  }));

  return { oatariSymbols, allSymbols };
}

function pickRandom(symbols: SymbolSpec[], rng: Rng): SymbolSpec {
  const index = rng.nextInt(symbols.length);
  return symbols[index]!;
}

function pickRandomExcluding(
  symbols: SymbolSpec[],
  excludeIds: string[],
  rng: Rng,
): SymbolSpec {
  const filtered = symbols.filter((s) => !excludeIds.includes(s.id));
  if (filtered.length === 0) {
    return pickRandom(symbols, rng);
  }
  return pickRandom(filtered, rng);
}
