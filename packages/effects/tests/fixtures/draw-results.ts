import type { DrawResultInput, SymbolSpec } from "../../src/types.js";

export const symbol7: SymbolSpec = { id: "7", label: "7", isKakuhen: true };
export const symbol3: SymbolSpec = { id: "3", label: "3", isKakuhen: true };
export const symbol1: SymbolSpec = { id: "1", label: "1", isKakuhen: false };
export const symbol5: SymbolSpec = { id: "5", label: "5", isKakuhen: false };

export const oatariResult: DrawResultInput = {
  outcome: "oatari",
  reels: { left: symbol7, center: symbol7, right: symbol7 },
  isReach: false,
  bonusType: { id: "kakuhen16R", label: "確変16R" },
  gameMode: "normal",
  consecutiveBonuses: 0,
};

export const reachHazureResult: DrawResultInput = {
  outcome: "hazure",
  reels: { left: symbol3, center: symbol1, right: symbol3 },
  isReach: true,
  gameMode: "normal",
  consecutiveBonuses: 0,
};

export const kakuhenOatariResult: DrawResultInput = {
  outcome: "oatari",
  reels: { left: symbol7, center: symbol7, right: symbol7 },
  isReach: false,
  bonusType: { id: "kakuhen16R", label: "確変16R" },
  gameMode: "kakuhen",
  consecutiveBonuses: 3,
};

export const hazureResult: DrawResultInput = {
  outcome: "hazure",
  reels: { left: symbol1, center: symbol5, right: symbol3 },
  isReach: false,
  gameMode: "normal",
  consecutiveBonuses: 0,
};
