import {
  defineMachine,
  prob,
  createRng,
  draw,
  createState,
} from "@pachinko/lottery";
import type { GameState } from "@pachinko/lottery";
import { createInlineReelRenderer, DEFAULT_TIMING } from "@pachinko/rendering";
import type { DrawResultInput, SymbolSpec } from "@pachinko/rendering";
import {
  createEffectsEngine,
  connectRenderer,
  flash,
  textOverlay,
  shake,
  fade,
  sequence,
  parallel,
} from "@pachinko/effects";
import type { EffectRule } from "@pachinko/effects";
import {
  createSessionTracker,
  renderStatsPanel,
  renderSlumpGraph,
  renderHitHistory,
} from "@pachinko/tracker";
import type { TrackerConfig } from "@pachinko/tracker";

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
const effectsCanvas = document.getElementById("effects-canvas") as HTMLCanvasElement;
const btnSpin = document.getElementById("btn-spin") as HTMLButtonElement;
const btnSkip = document.getElementById("btn-skip") as HTMLButtonElement;
const modeBanner = document.getElementById("mode-banner")!;
const modeLabel = document.getElementById("mode-label")!;
const modeDetail = document.getElementById("mode-detail")!;
const statsPanelCanvas = document.getElementById("stats-panel") as HTMLCanvasElement;
const slumpGraphCanvas = document.getElementById("slump-graph") as HTMLCanvasElement;
const hitHistoryCanvas = document.getElementById("hit-history") as HTMLCanvasElement;

// ─── UI update ───

const MODE_LABELS: Record<string, string> = {
  normal: "通常",
  kakuhen: "確変",
  jitan: "時短",
};

function updateModeBanner(state: GameState): void {
  modeBanner.className = `demo-mode-banner mode-${state.mode}`;
  modeLabel.textContent = MODE_LABELS[state.mode] ?? state.mode;

  if (state.mode === "kakuhen") {
    modeDetail.textContent = `1/3 確率`;
  } else if (state.mode === "jitan" && state.remainingSpins != null) {
    modeDetail.textContent = `残り ${state.remainingSpins} 回転`;
  } else {
    modeDetail.textContent = "";
  }
}

// ─── Tracker config ───

const trackerConfig: TrackerConfig = {
  ballsPerSpin: 4,
  ballsPerRound: {
    kakuhen16R: 100,
    tsujou: 100,
  },
  specProbability: 10, // Demo uses 1/10
  sampleInterval: 1, // Record every spin for demo
};

const chartBonusColors = {
  kakuhen16R: "#ff4444",
  tsujou: "#ffaa00",
};

function updateCharts(): void {
  const snap = sessionTracker.snapshot();
  const stats = sessionTracker.stats();

  const spCtx = statsPanelCanvas.getContext("2d")!;
  renderStatsPanel(spCtx, statsPanelCanvas.width, statsPanelCanvas.height, stats, {
    machineName: "Demo Machine",
    style: { bonusColors: chartBonusColors },
  });

  const sgCtx = slumpGraphCanvas.getContext("2d")!;
  renderSlumpGraph(sgCtx, slumpGraphCanvas.width, slumpGraphCanvas.height, snap.ballHistory, {
    style: { bonusColors: chartBonusColors },
  });

  const hhCtx = hitHistoryCanvas.getContext("2d")!;
  renderHitHistory(hhCtx, hitHistoryCanvas.width, hitHistoryCanvas.height, snap.hitHistory, {
    maxBars: 15,
    style: { bonusColors: chartBonusColors },
  });
}

// ─── Effect rules ───

const effectRules: EffectRule[] = [
  {
    id: "reach-flash",
    condition: { phase: "reach", isReach: true },
    effects: [
      parallel(
        flash({ color: "#ff0000", opacity: 0.4, count: 3, timing: { delay: 0, duration: 600 } }),
        shake({ intensity: 6, frequency: 25, timing: { delay: 0, duration: 500 } }),
      ),
    ],
  },
  {
    id: "oatari-result",
    condition: { phase: "result", outcome: "oatari" },
    effects: [
      sequence(
        flash({ color: "#ffd700", opacity: 0.7, count: 5, timing: { delay: 0, duration: 800 } }),
        parallel(
          textOverlay("大当り!", {
            font: "bold 64px sans-serif",
            color: "#ffd700",
            timing: { delay: 0, duration: 2500 },
            fadeIn: 200,
            fadeOut: 400,
          }),
          shake({ intensity: 12, frequency: 40, timing: { delay: 0, duration: 600 } }),
        ),
      ),
    ],
  },
  {
    id: "koatari-result",
    condition: { phase: "result", outcome: "koatari" },
    effects: [
      sequence(
        flash({ color: "#ff8800", opacity: 0.5, count: 3, timing: { delay: 0, duration: 500 } }),
        textOverlay("小当り", {
          font: "bold 48px sans-serif",
          color: "#ff8800",
          timing: { delay: 0, duration: 1500 },
          fadeIn: 150,
          fadeOut: 300,
        }),
      ),
    ],
  },
  {
    id: "kakuhen-reach-flash",
    condition: { phase: "reach", isReach: true, gameMode: "kakuhen" },
    effects: [
      parallel(
        flash({ color: "#ff4444", opacity: 0.6, count: 5, timing: { delay: 0, duration: 800 } }),
        shake({ intensity: 10, frequency: 35, timing: { delay: 0, duration: 700 } }),
      ),
    ],
    priority: 10,
    exclusive: true,
  },
];

// ─── State ───

const rng = createRng({ value: Date.now() });
let gameState: GameState = createState();
let spinning = false;
const sessionTracker = createSessionTracker(trackerConfig);

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

  // ─── Effects engine ───
  const effectsEngine = createEffectsEngine(effectsCanvas, { rules: effectRules });
  connectRenderer(renderer, effectsEngine);

  renderer.onComplete(() => {
    spinning = false;
    btnSpin.disabled = false;
  });

  function doSpin(): void {
    if (spinning) return;
    spinning = true;
    btnSpin.disabled = true;

    const result = draw(machine, gameState, rng);
    gameState = result.nextState;

    // Track in session tracker
    sessionTracker.recordSpin({
      outcome: result.outcome,
      bonusType: result.bonusType,
      mode: result.previousState.mode,
    });

    const renderInput: DrawResultInput = {
      outcome: result.outcome,
      reels: result.reels,
      isReach: result.isReach,
    };

    effectsEngine.start({
      ...renderInput,
      bonusType: result.bonusType,
      gameMode: result.previousState.mode,
      consecutiveBonuses: result.previousState.consecutiveBonuses,
    });
    renderer.spin(renderInput);
    updateModeBanner(result.nextState);
    updateCharts();
  }

  btnSpin.addEventListener("click", doSpin);
  btnSkip.addEventListener("click", () => {
    if (spinning) {
      renderer.skipToResult();
      effectsEngine.skipToResult();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.code === "Space" && !spinning) {
      e.preventDefault();
      doSpin();
    }
  });

  btnSpin.disabled = false;
  updateCharts();
}

// Disable spin until images loaded
btnSpin.disabled = true;
updateModeBanner(gameState);
init();
