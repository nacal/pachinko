import type { SymbolSpec, DrawResultInput, ReelResult } from "../../src/types";

export const symbolSeven: SymbolSpec = { id: "7", label: "7", isKakuhen: true };
export const symbolBar: SymbolSpec = { id: "bar", label: "BAR", isKakuhen: false };
export const symbolCherry: SymbolSpec = { id: "cherry", label: "🍒", isKakuhen: false };
export const symbolBell: SymbolSpec = { id: "bell", label: "🔔", isKakuhen: false };
export const symbolStar: SymbolSpec = { id: "star", label: "★", isKakuhen: false };

export const testSymbolStrip: readonly SymbolSpec[] = [
  symbolSeven,
  symbolBar,
  symbolCherry,
  symbolBell,
  symbolStar,
];

export const oatariReels: ReelResult = {
  left: symbolSeven,
  center: symbolSeven,
  right: symbolSeven,
};

export const hazureReels: ReelResult = {
  left: symbolSeven,
  center: symbolBar,
  right: symbolCherry,
};

export const reachReels: ReelResult = {
  left: symbolSeven,
  center: symbolSeven,
  right: symbolBar,
};

export const oatariResult: DrawResultInput = {
  outcome: "oatari",
  reels: oatariReels,
  isReach: true,
};

export const hazureResult: DrawResultInput = {
  outcome: "hazure",
  reels: hazureReels,
  isReach: false,
};

export const reachHazureResult: DrawResultInput = {
  outcome: "hazure",
  reels: reachReels,
  isReach: true,
};
