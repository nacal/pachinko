import {
  defineMachine,
  prob,
  createRng,
  draw,
  createState,
} from "@pachinko/lottery";
import type { GameState, DrawResult } from "@pachinko/lottery";
import { createInlineReelRenderer, DEFAULT_TIMING } from "@pachinko/rendering";
import type { DrawResultInput, SymbolSpec } from "@pachinko/rendering";

// ─── Machine definition (demo: high hit rate for fun) ───

const machine = defineMachine({
  id: "demo",
  name: "Demo Machine",
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
      probability: prob(1, 10),
      reachRate: 0.15,
      distribution: {
        kakuhen16R: 60,
        tsujou: 40,
      },
    },
    kakuhen: {
      probability: prob(1, 3),
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
  symbols: ["1", "2", "3", "4", "5", "6", "7", "8", "9"],
  kakuhenSymbols: ["7", "3"],
});

// ─── Load symbol images ───

const SYMBOL_IDS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;
const KAKUHEN_IDS = new Set(["3", "7"]);

async function loadSymbolImage(id: string): Promise<ImageBitmap> {
  const base = import.meta.env.BASE_URL ?? "/";
  const url = `${base}symbols/${id}.svg`;
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      createImageBitmap(img).then(resolve, reject);
    };
    img.onerror = () => reject(new Error(`Failed to load ${url}`));
    img.src = url;
  });
}

async function loadSymbolStrip(): Promise<SymbolSpec[]> {
  const entries = await Promise.all(
    SYMBOL_IDS.map(async (id) => {
      const image = await loadSymbolImage(id);
      return {
        id,
        label: id,
        isKakuhen: KAKUHEN_IDS.has(id),
        image,
      };
    }),
  );
  return entries;
}

// ─── DOM elements ───

const canvas = document.getElementById("reel-canvas") as HTMLCanvasElement;
const btnSpin = document.getElementById("btn-spin") as HTMLButtonElement;
const btnSkip = document.getElementById("btn-skip") as HTMLButtonElement;
const statOutcome = document.getElementById("stat-outcome")!;
const statReels = document.getElementById("stat-reels")!;
const statReach = document.getElementById("stat-reach")!;
const statMode = document.getElementById("stat-mode")!;
const statSpins = document.getElementById("stat-spins")!;
const statConsecutive = document.getElementById("stat-consecutive")!;

// ─── UI update ───

function updateStats(result: DrawResult): void {
  const outcomeLabel =
    result.outcome === "oatari" ? "大当り" :
    result.outcome === "koatari" ? "小当り" : "ハズレ";
  const outcomeClass = `outcome-${result.outcome}`;

  statOutcome.textContent = outcomeLabel;
  statOutcome.className = `stat-value ${outcomeClass}`;

  statReels.textContent = `${result.reels.left.label}  ${result.reels.center.label}  ${result.reels.right.label}`;
  statReach.textContent = result.isReach ? "Yes" : "No";
  statMode.textContent = result.nextState.mode;
  statSpins.textContent = String(totalSpins);
  statConsecutive.textContent = String(result.nextState.consecutiveBonuses);
}

// ─── State ───

const rng = createRng({ value: Date.now() });
let gameState: GameState = createState();
let totalSpins = 0;
let spinning = false;

// ─── Init ───

async function init(): Promise<void> {
  const symbolStrip = await loadSymbolStrip();

  const ctx = canvas.getContext("2d")!;
  const renderer = createInlineReelRenderer(ctx, {
    symbolStrip,
    timing: {
      ...DEFAULT_TIMING,
      baseSpinDuration: 800,
      stopInterval: 400,
      reachSlowdownDuration: 1800,
    },
  });

  renderer.onComplete(() => {
    spinning = false;
    btnSpin.disabled = false;
  });

  function doSpin(): void {
    if (spinning) return;
    spinning = true;
    btnSpin.disabled = true;
    totalSpins++;

    const result = draw(machine, gameState, rng);
    gameState = result.nextState;

    const renderInput: DrawResultInput = {
      outcome: result.outcome,
      reels: result.reels,
      isReach: result.isReach,
    };

    renderer.spin(renderInput);
    updateStats(result);
  }

  btnSpin.addEventListener("click", doSpin);
  btnSkip.addEventListener("click", () => {
    if (spinning) {
      renderer.skipToResult();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.code === "Space" && !spinning) {
      e.preventDefault();
      doSpin();
    }
  });

  btnSpin.disabled = false;
}

// Disable spin until images loaded
btnSpin.disabled = true;
init();
