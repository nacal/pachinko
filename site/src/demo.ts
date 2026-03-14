import {
  defineMachine,
  prob,
  createRng,
  draw,
  createState,
  nextState,
  drawReels,
} from "@pachinko/lottery";
import type { GameState, DrawResult } from "@pachinko/lottery";
import { createInlineReelRenderer, DEFAULT_TIMING } from "@pachinko/rendering";
import type { DrawResultInput, SymbolSpec } from "@pachinko/rendering";
import {
  createEffectsEngine,
  createBackgroundEngine,
  connectRenderer,
  connectBackgroundEngine,
  flash,
  textOverlay,
  shake,
  fade,
  vignette,
  sequence,
  parallel,
  colorBg,
  gradientBg,
  particleBg,
  resolveScenario,
  resolvePreReadingScenario,
  computeColorExpectations,
} from "@pachinko/effects";
import type {
  EffectRule,
  ReachPresentation,
  BackgroundRule,
  ScenarioConfig,
  PreReadingScenarioConfig,
  PresentationScenario,
  PreReadingScenarioResult,
  AmbientEffectPatch,
  ScenarioRng,
} from "@pachinko/effects";
import {
  createSessionTracker,
  renderStatsPanel,
  renderSlumpGraph,
  renderHitHistory,
} from "@pachinko/tracker";
import type { TrackerConfig } from "@pachinko/tracker";
import {
  createReserveOrchestrator,
  createReserveDisplay,
} from "@pachinko/reserve";
import type { ReserveEntry } from "@pachinko/reserve";

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

const bgCanvas = document.getElementById("bg-canvas") as HTMLCanvasElement;
const canvas = document.getElementById("reel-canvas") as HTMLCanvasElement;
const effectsCanvas = document.getElementById("effects-canvas") as HTMLCanvasElement;
const reserveCanvas = document.getElementById("reserve-canvas") as HTMLCanvasElement;
const btnSpin = document.getElementById("btn-spin") as HTMLButtonElement;
const btnConfirm = document.getElementById("btn-confirm") as HTMLButtonElement;
const btnSkip = document.getElementById("btn-skip") as HTMLButtonElement;
const chkAuto = document.getElementById("chk-auto") as HTMLInputElement;
const selSpeed = document.getElementById("sel-speed") as HTMLSelectElement;
const modeBanner = document.getElementById("mode-banner")!;
const modeLabel = document.getElementById("mode-label")!;
const modeDetail = document.getElementById("mode-detail")!;
const colorLegendEl = document.getElementById("color-legend")!;
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
    id: "pseudo-stop-flash",
    condition: { phase: "pseudo-stop" },
    effects: [
      parallel(
        flash({ color: "#ffffff", opacity: 0.5, count: 1, timing: { delay: 0, duration: 300 } }),
        shake({ intensity: 8, frequency: 30, timing: { delay: 0, duration: 350 } }),
      ),
    ],
  },
  {
    id: "pseudo-restart-flash",
    condition: { phase: "pseudo-restart" },
    effects: [
      flash({ color: "#4488ff", opacity: 0.3, count: 2, timing: { delay: 0, duration: 500 } }),
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

// ─── Reach presentations ───

const reachPresentations: ReachPresentation[] = [
  {
    id: "normal-reach",
    condition: { isReach: true },
    effects: [
      sequence(
        textOverlay("リーチ!", {
          font: "bold 72px sans-serif",
          color: "#ff0000",
          timing: { delay: 0, duration: 1500 },
          fadeIn: 200,
          fadeOut: 300,
        }),
        parallel(
          flash({ color: "#ff4444", opacity: 0.5, count: 5, timing: { delay: 0, duration: 1000 } }),
          shake({ intensity: 8, frequency: 30, timing: { delay: 0, duration: 1000 } }),
        ),
        textOverlay("ボタンを押せ!", {
          font: "bold 48px sans-serif",
          color: "#ffd700",
          timing: { delay: 0, duration: 3000 },
          fadeIn: 100,
          fadeOut: 0,
        }),
      ),
    ],
    requireConfirm: true,
    confirmReadyAt: 2500, // After リーチ!(1500) + flash/shake(1000)
  },
  {
    id: "kakuhen-super-reach",
    condition: { isReach: true, gameMode: "kakuhen" },
    effects: [
      sequence(
        flash({ color: "#ff0000", opacity: 0.8, count: 10, timing: { delay: 0, duration: 2000 } }),
        textOverlay("超激アツ!", {
          font: "bold 96px sans-serif",
          color: "#ff0000",
          timing: { delay: 0, duration: 2000 },
          fadeIn: 300,
          fadeOut: 500,
        }),
        parallel(
          shake({ intensity: 15, frequency: 50, timing: { delay: 0, duration: 1500 } }),
          flash({ color: "#ffd700", opacity: 0.6, count: 8, timing: { delay: 0, duration: 1500 } }),
        ),
        textOverlay("ボタンを押せ!", {
          font: "bold 48px sans-serif",
          color: "#ffd700",
          timing: { delay: 0, duration: 3000 },
          fadeIn: 100,
          fadeOut: 0,
        }),
      ),
    ],
    priority: 10,
    requireConfirm: true,
    confirmReadyAt: 5500, // After flash(2000) + 超激アツ!(2000) + shake/flash(1500)
  },
];

// ─── Background rules ───

const backgroundRules: BackgroundRule[] = [
  {
    id: "reach-intense-bg",
    condition: { phase: ["reach", "reach-presentation"], isReach: true },
    source: gradientBg({ colors: ["#330000", "#660000", "#990000"], speed: 2 }),
    transition: { type: "crossfade", duration: 300 },
    priority: 10,
  },
  {
    id: "oatari-celebration-bg",
    condition: { phase: "result", outcome: "oatari" },
    source: particleBg({ count: 100, color: "#ffd700", speed: 3, size: 4 }),
    transition: { type: "fade", duration: 200 },
  },
];

// ─── Scenario config (presentation distribution tables) ───

// Shared reach presentation effects
const normalReachEffects = sequence(
  textOverlay("リーチ!", {
    font: "bold 72px sans-serif",
    color: "#ff0000",
    timing: { delay: 0, duration: 1500 },
    fadeIn: 200,
    fadeOut: 300,
  }),
  parallel(
    flash({ color: "#ff4444", opacity: 0.5, count: 5, timing: { delay: 0, duration: 1000 } }),
    shake({ intensity: 8, frequency: 30, timing: { delay: 0, duration: 1000 } }),
  ),
  textOverlay("ボタンを押せ!", {
    font: "bold 48px sans-serif",
    color: "#ffd700",
    timing: { delay: 0, duration: 3000 },
    fadeIn: 100,
    fadeOut: 0,
  }),
);

const superReachEffects = sequence(
  flash({ color: "#ff0000", opacity: 0.8, count: 10, timing: { delay: 0, duration: 2000 } }),
  textOverlay("超激アツ!", {
    font: "bold 96px sans-serif",
    color: "#ff0000",
    timing: { delay: 0, duration: 2000 },
    fadeIn: 300,
    fadeOut: 500,
  }),
  parallel(
    shake({ intensity: 15, frequency: 50, timing: { delay: 0, duration: 1500 } }),
    flash({ color: "#ffd700", opacity: 0.6, count: 8, timing: { delay: 0, duration: 1500 } }),
  ),
  textOverlay("ボタンを押せ!", {
    font: "bold 48px sans-serif",
    color: "#ffd700",
    timing: { delay: 0, duration: 3000 },
    fadeIn: 100,
    fadeOut: 0,
  }),
);

const scenarioConfig: ScenarioConfig = {
  defaultColor: "white",
  rules: [
    // ─── 大当たり（必ずリーチ）: 熱い色が出やすい ───
    {
      id: "oatari",
      condition: { outcome: "oatari" },
      priority: 10,
      color: {
        entries: [
          // reliability高め → ガセで通常ハズレに漏れにくい
          { color: "rainbow", weight: 50, reliability: 0.98 },
          { color: "gold", weight: 30, reliability: 0.95 },
          { color: "red", weight: 40, reliability: 0.9 },
          { color: "green", weight: 30, reliability: 0.7 },
          { color: "blue", weight: 20, reliability: 0.5 },
          { color: "white", weight: 10 },
        ],
      },
      pseudoCounts: [
        { count: 0, weight: 40 },
        { count: 1, weight: 30 },
        { count: 2, weight: 20 },
        { count: 3, weight: 10 },
      ],
      reachPresentations: [
        {
          presentationId: "kakuhen-super-reach",
          weight: 70,
          effects: [superReachEffects],
          requireConfirm: true,
          confirmReadyAt: 5500,
        },
        {
          presentationId: "normal-reach",
          weight: 30,
          effects: [normalReachEffects],
          requireConfirm: true,
          confirmReadyAt: 2500,
        },
      ],
      phaseEffects: [
        {
          phase: "reach",
          entries: [
            {
              weight: 100,
              effects: [
                parallel(
                  flash({ color: "#ff0000", opacity: 0.4, count: 3, timing: { delay: 0, duration: 600 } }),
                  shake({ intensity: 6, frequency: 25, timing: { delay: 0, duration: 500 } }),
                ),
              ],
            },
          ],
        },
        {
          phase: "result",
          entries: [
            {
              weight: 100,
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
          ],
        },
      ],
    },
    // ─── リーチハズレ: 中間色が中心、たまにガセ熱 ───
    {
      id: "reach-hazure",
      condition: { outcome: "hazure", isReach: true },
      priority: 5,
      color: {
        entries: [
          { color: "gold", weight: 3 },
          { color: "red", weight: 8 },
          { color: "green", weight: 25 },
          { color: "blue", weight: 30 },
          { color: "white", weight: 50 },
        ],
      },
      pseudoCounts: [
        { count: 0, weight: 80 },
        { count: 1, weight: 15 },
        { count: 2, weight: 5 },
      ],
      reachPresentations: [
        {
          presentationId: "normal-reach",
          weight: 90,
          effects: [normalReachEffects],
          requireConfirm: true,
          confirmReadyAt: 2500,
        },
        {
          presentationId: "kakuhen-super-reach",
          weight: 10,
          effects: [superReachEffects],
          requireConfirm: true,
          confirmReadyAt: 5500,
        },
      ],
    },
    // ─── 通常ハズレ（リーチなし）: ほぼ白/青のみ ───
    {
      id: "normal-hazure",
      condition: { outcome: "hazure", isReach: false },
      priority: 0,
      color: {
        entries: [
          { color: "blue", weight: 10 },
          { color: "white", weight: 90 },
        ],
      },
    },
  ],
};

// ─── Pre-reading scenario config ───

const preReadingConfig: PreReadingScenarioConfig = {
  base: scenarioConfig,
  consecutivePredictions: [
    {
      id: "escalating-vignette",
      condition: { outcome: "oatari" },
      pattern: {
        id: "3-step-vignette",
        steps: [
          {
            spinsBeforeTarget: 3,
            phase: null,
            effects: [
              vignette({
                color: "#2244aa",
                opacity: 0.35,
                spread: 0.35,
                pulseCount: 2,
                pulseMin: 0.5,
                timing: { delay: 0, duration: 4000 },
              }),
            ],
          },
          {
            spinsBeforeTarget: 2,
            phase: null,
            effects: [
              vignette({
                color: "#aa8800",
                opacity: 0.45,
                spread: 0.45,
                pulseCount: 3,
                pulseMin: 0.4,
                timing: { delay: 0, duration: 4000 },
              }),
            ],
          },
          {
            spinsBeforeTarget: 1,
            phase: null,
            effects: [
              parallel(
                vignette({
                  color: "#cc2200",
                  opacity: 0.55,
                  spread: 0.55,
                  pulseCount: 4,
                  pulseMin: 0.3,
                  timing: { delay: 0, duration: 4000 },
                }),
                shake({ intensity: 3, frequency: 15, timing: { delay: 1000, duration: 800 } }),
              ),
            ],
          },
        ],
      },
      weight: 40,
    },
  ],
  zones: [
    {
      id: "hot-zone",
      triggerCondition: { outcome: "oatari" },
      leadSpins: 2,
      zone: {
        id: "hot-zone",
        ambientEffects: [
          {
            id: "zone-red-pulse",
            phase: null,
            effects: [
              vignette({
                color: "#880022",
                opacity: 0.3,
                spread: 0.3,
                pulseCount: 3,
                pulseMin: 0.4,
                timing: { delay: 0, duration: 4000 },
              }),
            ],
            priority: -10,
          },
        ],
      },
      weight: 30,
    },
  ],
  telopRules: [],
  groupPredictionRules: [
    {
      id: "group-flash",
      condition: { outcome: "oatari" },
      spinOffset: -1,
      count: 3,
      memberEffect: flash({ color: "#ffffff", opacity: 0.3, count: 1, timing: { delay: 0, duration: 200 } }),
      staggerDelay: 100,
      phase: "spin-start",
      weight: 25,
    },
  ],
};

// ─── Scenario RNG adapter ───

function createScenarioRng(lotteryRng: import("@pachinko/lottery").Rng): ScenarioRng {
  return { next: () => lotteryRng.next() };
}

// ─── Color expectation display ───

const COLOR_DISPLAY_MAP: Record<string, { label: string; css: string }> = {
  rainbow: { label: "虹", css: "conic-gradient(#f00, #ff0, #0f0, #0ff, #f0f, #f00)" },
  gold: { label: "金", css: "#ffd700" },
  red: { label: "赤", css: "#ff4444" },
  green: { label: "緑", css: "#44ff88" },
  blue: { label: "青", css: "#4488ff" },
  white: { label: "白", css: "#ffffff" },
};

function renderColorExpectations(): void {
  const expectations = computeColorExpectations(scenarioConfig, {
    oatariRate: 1 / 10,       // Demo machine: 1/10 in normal mode
    hazureReachRate: 0.15,    // Demo machine: 15% reach rate
  });

  colorLegendEl.innerHTML = "";

  for (const entry of expectations) {
    const info = COLOR_DISPLAY_MAP[entry.color] ?? { label: entry.color, css: "#888" };
    const pct = (entry.expectation * 100).toFixed(1);
    const barColor = info.css.startsWith("conic") ? "#ff44ff" : info.css;

    const row = document.createElement("div");
    row.className = "color-legend-row";
    row.innerHTML = `
      <span class="color-legend-circle" style="background: ${info.css};"></span>
      <span class="color-legend-name">${info.label}</span>
      <span class="color-legend-bar-track">
        <span class="color-legend-bar-fill" style="width: ${entry.expectation * 100}%; background: ${barColor};"></span>
      </span>
      <span class="color-legend-pct">${pct}%</span>
    `;
    colorLegendEl.appendChild(row);
  }
}

renderColorExpectations();

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
      enableReachPresentation: true,
    },
    style: {
      backgroundColor: "rgba(0, 0, 0, 0)",
    },
  });

  // ─── Background engine ───
  const bgEngine = createBackgroundEngine(bgCanvas, {
    modeBackgrounds: {
      normal: gradientBg({ colors: ["#0a0a1a", "#1a1a3e", "#0a0a1a"], speed: 0.3 }),
      kakuhen: gradientBg({ colors: ["#3a0000", "#660022", "#3a0000"], speed: 1 }),
      jitan: gradientBg({ colors: ["#001a33", "#003366", "#001a33"], speed: 0.5 }),
    },
    rules: backgroundRules,
    defaultTransition: { type: "fade", duration: 500 },
  });
  connectBackgroundEngine(renderer, bgEngine);

  // ─── Effects engine ───
  const effectsEngine = createEffectsEngine(effectsCanvas, {
    rules: effectRules,
    reachPresentations,
  });
  connectRenderer(renderer, effectsEngine);

  // Show/hide confirm button based on reach presentation state
  function showConfirmButton(): void {
    btnConfirm.style.display = "";
    btnSpin.style.display = "none";
  }

  function hideConfirmButton(): void {
    btnConfirm.style.display = "none";
    btnSpin.style.display = "";
  }

  effectsEngine.onConfirmReady(() => {
    if (chkAuto.checked) {
      setTimeout(() => effectsEngine.confirmReachPresentation(), 300);
    } else {
      showConfirmButton();
    }
  });

  effectsEngine.onReachPresentationEnd(() => {
    hideConfirmButton();
  });

  // ─── Reserve display ───
  const reserveDisplay = createReserveDisplay(reserveCanvas, {
    position: { x: 24, y: 20 },
    circleRadius: 10,
    gap: 10,
    colorMap: {
      white: "#ffffff",
      blue: "#4488ff",
      green: "#44ff88",
      red: "#ff4444",
      gold: "#ffd700",
      rainbow: (ctx2, x, y, r, time) => {
        const gradient = ctx2.createConicGradient(time * 0.002, x, y);
        gradient.addColorStop(0, "#ff0000");
        gradient.addColorStop(0.2, "#ffff00");
        gradient.addColorStop(0.4, "#00ff00");
        gradient.addColorStop(0.6, "#00ffff");
        gradient.addColorStop(0.8, "#ff00ff");
        gradient.addColorStop(1, "#ff0000");
        ctx2.fillStyle = gradient;
        ctx2.beginPath();
        ctx2.arc(x, y, r, 0, Math.PI * 2);
        ctx2.fill();
        ctx2.strokeStyle = "rgba(255, 255, 255, 0.6)";
        ctx2.lineWidth = 1;
        ctx2.stroke();
      },
    },
  });

  // ─── Scenario RNG ───
  const scenarioRng = createScenarioRng(rng);

  // ─── Spin with DrawResult (used by both direct spin and reserve) ───
  function doSpinWithResult(
    result: import("@pachinko/lottery").DrawResult,
    scenario?: PresentationScenario,
    entry?: ReserveEntry,
  ): void {
    spinning = true;
    btnSpin.disabled = false; // Allow adding reserves while spinning

    // Show spinning entry in active slot
    reserveDisplay.setActive(entry ?? null);

    gameState = result.nextState;

    sessionTracker.recordSpin({
      outcome: result.outcome,
      bonusType: result.bonusType,
      mode: result.previousState.mode,
    });

    const pseudoCount = scenario?.pseudoCount ?? 0;
    const renderInput: DrawResultInput = {
      outcome: result.outcome,
      reels: result.reels,
      isReach: result.isReach,
      pseudoCount,
    };

    const effectInput = {
      ...renderInput,
      bonusType: result.bonusType,
      gameMode: result.previousState.mode,
      consecutiveBonuses: result.previousState.consecutiveBonuses,
    };
    effectsEngine.start(effectInput, scenario);
    bgEngine.start(effectInput);
    renderer.spin(renderInput);
    bgEngine.setMode(result.nextState.mode);
    updateModeBanner(result.nextState);
    updateCharts();
  }

  // ─── Reserve orchestrator ───
  const orchestrator = createReserveOrchestrator({
    machine,
    rng,
    maxReserve: 4,
    autoSpinDelay: 500,
    preReading: {
      defaultColor: "white",
      rules: [
        { color: "rainbow", probability: 0.5, reliability: 0.95,
          condition: { outcome: "oatari" } },
        { color: "gold", probability: 0.3, reliability: 0.9,
          condition: { outcome: "oatari" } },
        { color: "red", probability: 0.5, reliability: 0.7,
          condition: { outcome: "oatari" } },
        { color: "green", probability: 0.3, reliability: 0.8,
          condition: { isReach: true } },
        { color: "blue", probability: 0.1 },
      ],
    },
    resolveScenario: (drawResult, context) => {
      const input = {
        outcome: drawResult.outcome,
        reels: drawResult.reels,
        isReach: drawResult.isReach,
        bonusType: drawResult.bonusType,
        gameMode: drawResult.previousState.mode,
        consecutiveBonuses: drawResult.previousState.consecutiveBonuses,
      };
      const queueContext = {
        queuePosition: context.queuePosition,
        queueSize: context.queueSize,
        existingEntries: context.existingEntries.map((e) => ({
          drawResult: {
            outcome: e.drawResult.outcome,
            reels: e.drawResult.reels,
            isReach: e.drawResult.isReach,
            bonusType: e.drawResult.bonusType,
            gameMode: e.drawResult.previousState.mode,
            consecutiveBonuses: e.drawResult.previousState.consecutiveBonuses,
          },
          scenario: e.scenario,
        })),
      };
      return resolvePreReadingScenario(preReadingConfig, input, queueContext, scenarioRng);
    },
    applyScenarioPatches: (entries, rawPatches) => {
      const patches = rawPatches as AmbientEffectPatch[];
      for (const patch of patches) {
        if (patch.queueIndex < 0 || patch.queueIndex >= entries.length) continue;
        const entry = entries[patch.queueIndex]!;
        const existing = entry.scenario as PresentationScenario | undefined;
        if (!existing) continue;
        entries[patch.queueIndex] = {
          ...entry,
          scenario: {
            ...existing,
            ambientEffects: [
              ...(existing.ambientEffects ?? []),
              ...patch.ambientEffects,
            ],
            zoneId: patch.zoneId ?? existing.zoneId,
            telop: patch.telop ?? existing.telop,
          },
        };
      }
    },
    onSpin: (entry: ReserveEntry) => {
      doSpinWithResult(entry.drawResult, entry.scenario as PresentationScenario | undefined, entry);
    },
    onQueueChange: (queue) => {
      reserveDisplay.update(queue);
    },
  });

  function doSpin(): void {
    if (spinning) {
      // Already spinning — add to reserve queue
      orchestrator.request(gameState);
      return;
    }
    spinning = true;
    btnSpin.disabled = false; // Allow adding reserves

    const result = draw(machine, gameState, rng);
    const { scenario } = resolvePreReadingScenario(preReadingConfig, {
      outcome: result.outcome,
      reels: result.reels,
      isReach: result.isReach,
      bonusType: result.bonusType,
      gameMode: result.previousState.mode,
      consecutiveBonuses: result.previousState.consecutiveBonuses,
    }, { queuePosition: 0, queueSize: 1, existingEntries: [] }, scenarioRng);
    const directEntry: ReserveEntry = {
      id: Date.now(),
      drawResult: result,
      color: scenario.color,
      scenario,
    };
    doSpinWithResult(result, scenario, directEntry);
  }

  // ─── Forced trigger: build a DrawResult with specific outcome ───

  function buildForcedResult(
    trigger: string,
  ): { result: DrawResult; pseudoCountOverride?: number } {
    // Use the real draw pipeline, then override outcome/reels as needed
    const baseResult = draw(machine, gameState, rng);

    switch (trigger) {
      case "oatari": {
        // Force oatari with reach
        const reels = drawReels(machine.symbols, "oatari", rng);
        const bonusEntries = machine.bonusDistribution[gameState.mode];
        const bonusType = bonusEntries && bonusEntries.length > 0
          ? bonusEntries[Math.floor(rng.next() * bonusEntries.length)]!.value
          : baseResult.bonusType;
        const newState = nextState(gameState, "oatari", bonusType);
        return {
          result: {
            ...baseResult,
            outcome: "oatari",
            reels,
            isReach: true,
            bonusType,
            nextState: newState,
          },
        };
      }
      case "reach-hazure": {
        const reels = drawReels(machine.symbols, "hazure", rng, { reach: true });
        const newState = nextState(gameState, "hazure", null);
        return {
          result: {
            ...baseResult,
            outcome: "hazure",
            reels,
            isReach: true,
            bonusType: null,
            nextState: newState,
          },
        };
      }
      case "hazure": {
        const reels = drawReels(machine.symbols, "hazure", rng, { reach: false });
        const newState = nextState(gameState, "hazure", null);
        return {
          result: {
            ...baseResult,
            outcome: "hazure",
            reels,
            isReach: false,
            bonusType: null,
            nextState: newState,
          },
        };
      }
      case "pseudo1":
      case "pseudo2":
      case "pseudo3": {
        const pseudoCount = trigger === "pseudo1" ? 1 : trigger === "pseudo2" ? 2 : 3;
        // Pseudo-consecutive with oatari (most dramatic)
        const reels = drawReels(machine.symbols, "oatari", rng);
        const bonusEntries = machine.bonusDistribution[gameState.mode];
        const bonusType = bonusEntries && bonusEntries.length > 0
          ? bonusEntries[Math.floor(rng.next() * bonusEntries.length)]!.value
          : baseResult.bonusType;
        const newState = nextState(gameState, "oatari", bonusType);
        return {
          result: {
            ...baseResult,
            outcome: "oatari",
            reels,
            isReach: true,
            bonusType,
            nextState: newState,
          },
          pseudoCountOverride: pseudoCount,
        };
      }
      case "kakuhen": {
        // Force oatari with kakuhen bonus
        const reels = drawReels(machine.symbols, "oatari", rng);
        const kakuhenBonus = machine.bonusDistribution[gameState.mode]?.find(
          (e) => e.value.nextMode === "kakuhen",
        );
        const bonusType = kakuhenBonus?.value ?? baseResult.bonusType;
        const newState = nextState(gameState, "oatari", bonusType);
        return {
          result: {
            ...baseResult,
            outcome: "oatari",
            reels,
            isReach: true,
            bonusType,
            nextState: newState,
          },
        };
      }
      default:
        return { result: baseResult };
    }
  }

  function doTriggeredSpin(trigger: string): void {
    const { result, pseudoCountOverride } = buildForcedResult(trigger);
    const input = {
      outcome: result.outcome,
      reels: result.reels,
      isReach: result.isReach,
      bonusType: result.bonusType,
      gameMode: result.previousState.mode,
      consecutiveBonuses: result.previousState.consecutiveBonuses,
    };
    const { scenario } = resolvePreReadingScenario(
      preReadingConfig, input,
      { queuePosition: 0, queueSize: 1, existingEntries: [] },
      scenarioRng,
    );
    // Override pseudoCount if trigger specifies it
    const finalScenario = pseudoCountOverride !== undefined
      ? { ...scenario, pseudoCount: pseudoCountOverride }
      : scenario;
    const directEntry: ReserveEntry = {
      id: Date.now(),
      drawResult: result,
      color: finalScenario.color,
      scenario: finalScenario,
    };
    doSpinWithResult(result, finalScenario, directEntry);
  }

  // ─── Auto mode ───

  let autoTimerId: ReturnType<typeof setTimeout> | null = null;

  function getAutoDelay(): number {
    return Number(selSpeed.value) || 500;
  }

  function fillReserve(): void {
    while (orchestrator.queue().length < 4) {
      const added = orchestrator.request(gameState);
      if (!added) break;
    }
  }

  function scheduleAutoSpin(): void {
    if (!chkAuto.checked) return;
    fillReserve();
    autoTimerId = setTimeout(() => {
      autoTimerId = null;
      if (!chkAuto.checked) return;
      fillReserve();
      doSpin();
    }, getAutoDelay());
  }

  function stopAuto(): void {
    if (autoTimerId !== null) {
      clearTimeout(autoTimerId);
      autoTimerId = null;
    }
  }

  // When a spin completes, schedule the next auto spin
  renderer.onComplete(() => {
    spinning = false;
    btnSpin.disabled = false;
    hideConfirmButton();
    reserveDisplay.setActive(null);
    orchestrator.notifySpinComplete();
    // Auto: schedule next spin
    if (chkAuto.checked) {
      // In auto mode, auto-confirm reach presentations
      scheduleAutoSpin();
    }
  });

  chkAuto.addEventListener("change", () => {
    if (chkAuto.checked) {
      fillReserve();
      if (!spinning) {
        doSpin();
      }
    } else {
      stopAuto();
    }
  });

  // ─── Event listeners ───

  btnSpin.addEventListener("click", doSpin);

  btnConfirm.addEventListener("click", () => {
    effectsEngine.confirmReachPresentation();
  });

  btnSkip.addEventListener("click", () => {
    if (spinning) {
      if (effectsEngine.isInReachPresentation()) {
        effectsEngine.confirmReachPresentation();
      }
      renderer.skipToResult();
      effectsEngine.skipToResult();
    }
  });

  // Trigger buttons
  for (const btn of document.querySelectorAll<HTMLButtonElement>("[data-trigger]")) {
    btn.addEventListener("click", () => {
      const trigger = btn.dataset.trigger!;
      if (spinning) return;
      doTriggeredSpin(trigger);
    });
  }

  document.addEventListener("keydown", (e) => {
    if (e.code === "Space") {
      e.preventDefault();
      if (effectsEngine.isInReachPresentation()) {
        effectsEngine.confirmReachPresentation();
      } else {
        doSpin();
      }
    }
  });

  btnSpin.disabled = false;
  updateCharts();
}

// Disable spin until images loaded
btnSpin.disabled = true;
updateModeBanner(gameState);
init();
