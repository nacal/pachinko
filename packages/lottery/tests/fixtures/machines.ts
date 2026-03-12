import { defineMachine, prob } from "../../src/index.js";

/**
 * Simple test machine: high hit rate for quick testing
 */
export const simpleMachine = defineMachine({
  id: "simple",
  name: "Simple Test Machine",
  bonusTypes: {
    kakuhen16R: {
      label: "確変16R",
      rounds: 16,
      nextMode: "kakuhen",
    },
    tsujou: {
      label: "通常10R",
      rounds: 10,
      nextMode: { mode: "jitan", spins: 50 },
    },
  },
  modes: {
    normal: {
      probability: prob(1, 10), // 1/10 for quick tests
      reachRate: 0.1,
      distribution: {
        kakuhen16R: 60,
        tsujou: 40,
      },
    },
    kakuhen: {
      probability: prob(1, 5), // 1/5
      reachRate: 0.3,
      distribution: {
        kakuhen16R: 70,
        tsujou: 30,
      },
    },
    jitan: {
      probability: prob(1, 10),
      reachRate: 0.2,
      distribution: {
        kakuhen16R: 50,
        tsujou: 50,
      },
    },
  },
  symbols: ["1", "2", "3", "4", "5", "6", "7"],
  kakuhenSymbols: ["7", "3"],
});

/**
 * Realistic machine: ~1/319 spec (like many real machines)
 */
export const realisticMachine = defineMachine({
  id: "evangelion",
  name: "CRエヴァンゲリオン",
  bonusTypes: {
    kakuhen16R: {
      label: "確変16R",
      rounds: 16,
      nextMode: "kakuhen",
    },
    kakuhen4R: {
      label: "確変4R(潜伏)",
      rounds: 4,
      nextMode: "kakuhen",
    },
    tsujou: {
      label: "通常10R",
      rounds: 10,
      nextMode: { mode: "jitan", spins: 100 },
    },
  },
  modes: {
    normal: {
      probability: prob(1, 319.68),
      reachRate: 0.03,
      distribution: {
        kakuhen16R: 50,
        kakuhen4R: 20,
        tsujou: 30,
      },
    },
    kakuhen: {
      probability: prob(1, 39.96),
      reachRate: 0.3,
      distribution: {
        kakuhen16R: 60,
        tsujou: 40,
      },
    },
    jitan: {
      probability: prob(1, 319.68),
      reachRate: 0.1,
      distribution: {
        kakuhen16R: 50,
        tsujou: 50,
      },
    },
  },
  symbols: ["1", "2", "3", "4", "5", "6", "7"],
  kakuhenSymbols: ["7", "3"],
});
