import type {
  ReserveColorRenderer,
  ReserveDisplay,
  ReserveDisplayConfig,
  ReserveEntry,
} from "./types.js";

interface DisplaySlot {
  entry: ReserveEntry | null;
  scale: number;
  opacity: number;
  targetScale: number;
  targetOpacity: number;
}

export function createReserveDisplay(
  canvas: HTMLCanvasElement,
  config: ReserveDisplayConfig,
): ReserveDisplay {
  const ctx = canvas.getContext("2d")!;
  const maxDisplay = config.maxDisplay ?? 4;
  const radius = config.circleRadius ?? 12;
  const gap = config.gap ?? 8;
  const pos = config.position ?? { x: radius + 4, y: radius + 4 };
  const colorMap = config.colorMap;

  // Total slots: 1 (active) + maxDisplay (queue)
  const totalSlots = 1 + maxDisplay;

  let width = canvas.width;
  let height = canvas.height;
  let animFrameId: number | null = null;

  let activeEntry: ReserveEntry | null = null;
  let queueEntries: readonly ReserveEntry[] = [];

  const slots: DisplaySlot[] = Array.from({ length: totalSlots }, () => ({
    entry: null,
    scale: 0,
    opacity: 0,
    targetScale: 0,
    targetOpacity: 0,
  }));

  function drawCircle(
    slot: DisplaySlot,
    x: number,
    y: number,
    r: number,
    time: number,
  ): void {
    if (!slot.entry || slot.opacity <= 0) return;

    ctx.save();
    ctx.globalAlpha = slot.opacity;

    const colorValue = colorMap[slot.entry.color];

    if (typeof colorValue === "function") {
      (colorValue as ReserveColorRenderer)(ctx, x, y, r, time);
    } else {
      ctx.fillStyle = (colorValue as string) ?? "#888888";
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();

      // Subtle border
      ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    ctx.restore();
  }

  function syncSlots(): void {
    // Slot 0: active entry
    const slot0 = slots[0]!;
    if (activeEntry) {
      const isNew = slot0.entry?.id !== activeEntry.id;
      slot0.entry = activeEntry;
      slot0.targetScale = 1;
      slot0.targetOpacity = 1;
      if (isNew) {
        slot0.scale = 0;
        slot0.opacity = 0;
      }
    } else {
      if (slot0.entry) {
        slot0.targetScale = 0;
        slot0.targetOpacity = 0;
      }
      if (slot0.opacity <= 0.02) {
        slot0.entry = null;
      }
    }

    // Slots 1..maxDisplay: queue entries
    for (let i = 0; i < maxDisplay; i++) {
      const slot = slots[i + 1]!;
      if (i < queueEntries.length) {
        const isNew = slot.entry?.id !== queueEntries[i]!.id;
        slot.entry = queueEntries[i]!;
        slot.targetScale = 1;
        slot.targetOpacity = 1;
        if (isNew) {
          slot.scale = 0;
          slot.opacity = 0;
        }
      } else {
        if (slot.entry) {
          slot.targetScale = 0;
          slot.targetOpacity = 0;
        }
        if (slot.opacity <= 0.02) {
          slot.entry = null;
        }
      }
    }
  }

  function animate(time: number): void {
    const speed = 0.15;
    let needsAnimation = false;

    for (const slot of slots) {
      if (Math.abs(slot.scale - slot.targetScale) > 0.01) {
        slot.scale += (slot.targetScale - slot.scale) * speed;
        needsAnimation = true;
      } else {
        slot.scale = slot.targetScale;
      }

      if (Math.abs(slot.opacity - slot.targetOpacity) > 0.01) {
        slot.opacity += (slot.targetOpacity - slot.opacity) * speed;
        needsAnimation = true;
      } else {
        slot.opacity = slot.targetOpacity;
      }
    }

    // Active slot pulse: always request next frame while active
    const hasActive = activeEntry !== null && slots[0]!.opacity > 0.02;
    if (hasActive) needsAnimation = true;

    // Render
    ctx.clearRect(0, 0, width, height);

    for (let i = 0; i < totalSlots; i++) {
      const slot = slots[i]!;
      const x = pos.x + i * (radius * 2 + gap);
      const y = pos.y;

      // Empty slot indicator
      if (!slot.entry || slot.opacity <= 0.02) {
        ctx.save();
        ctx.globalAlpha = 0.2;
        ctx.fillStyle = "#444444";
        ctx.beginPath();
        ctx.arc(x, y, radius * 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Active slot (i === 0): pulse effect
      if (i === 0 && hasActive) {
        const pulse = 0.85 + 0.15 * Math.sin(time * 0.004);
        const r = radius * slot.scale * pulse;
        drawCircle(slot, x, y, r, time);
      } else {
        const r = radius * slot.scale;
        drawCircle(slot, x, y, r, time);
      }
    }

    if (needsAnimation) {
      animFrameId = requestAnimationFrame(animate);
    } else {
      animFrameId = null;
    }
  }

  function scheduleAnimation(): void {
    if (animFrameId === null) {
      animFrameId = requestAnimationFrame(animate);
    }
  }

  const display: ReserveDisplay = {
    update(entries: readonly ReserveEntry[]): void {
      queueEntries = entries;
      syncSlots();
      scheduleAnimation();
    },

    setActive(entry: ReserveEntry | null): void {
      activeEntry = entry;
      syncSlots();
      scheduleAnimation();
    },

    render(): void {
      scheduleAnimation();
    },

    resize(w: number, h: number): void {
      width = w;
      height = h;
      canvas.width = w;
      canvas.height = h;
      scheduleAnimation();
    },

    destroy(): void {
      if (animFrameId !== null) {
        cancelAnimationFrame(animFrameId);
        animFrameId = null;
      }
    },
  };

  // 初回描画（空スロットを表示）
  scheduleAnimation();

  return display;
}
