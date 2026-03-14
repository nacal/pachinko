import type { SpinInput, BonusType, TrackerConfig, HitEntry } from "../../src/types.js";

export const kakuhen16R: BonusType = {
  id: "kakuhen16R",
  label: "確変16R",
  category: "oatari",
  rounds: 16,
  nextMode: "kakuhen",
  nextModeSpins: null,
};

export const tsujou10R: BonusType = {
  id: "tsujou10R",
  label: "通常10R",
  category: "oatari",
  rounds: 10,
  nextMode: "jitan",
  nextModeSpins: 50,
};

export const defaultConfig: TrackerConfig = {
  ballsPerSpin: 4,
  ballsPerRound: {
    kakuhen16R: 100,
    tsujou10R: 100,
  },
  specProbability: 319.68,
  sampleInterval: 5,
};

export function makeHazure(mode: "normal" | "kakuhen" | "jitan" = "normal"): SpinInput {
  return { outcome: "hazure", bonusType: null, mode };
}

export function makeOatari(
  bonus: BonusType = kakuhen16R,
  mode: "normal" | "kakuhen" | "jitan" = "normal",
): SpinInput {
  return { outcome: "oatari", bonusType: bonus, mode };
}

/** Generate a sequence: N hazures then 1 oatari */
export function makeHitSequence(
  rotations: number,
  bonus: BonusType = kakuhen16R,
  mode: "normal" | "kakuhen" | "jitan" = "normal",
): SpinInput[] {
  const spins: SpinInput[] = [];
  for (let i = 0; i < rotations; i++) {
    spins.push(makeHazure(mode));
  }
  spins.push(makeOatari(bonus, mode));
  return spins;
}
