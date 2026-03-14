import type { BackgroundSource, BackgroundRenderFn } from "./background-types";
import { parseHexColor } from "./utils";

/** Solid color background */
export function colorBg(color: string): BackgroundSource {
  return { type: "color", color };
}

/** Image background (cover fit) */
export function imageBg(image: ImageBitmap): BackgroundSource {
  return { type: "image", image };
}

/** Video background */
export function videoBg(video: HTMLVideoElement): BackgroundSource {
  return { type: "video", video };
}

/** Custom canvas-drawn background */
export function canvasBg(render: BackgroundRenderFn): BackgroundSource {
  return { type: "canvas", render };
}

// ─── Animated Presets ───

export interface ParticleBgOptions {
  readonly count?: number;
  readonly color?: string;
  readonly speed?: number;
  readonly size?: number;
}

/** Animated particle field background */
export function particleBg(options?: ParticleBgOptions): BackgroundSource {
  const count = options?.count ?? 60;
  const color = options?.color ?? "#ffffff";
  const speed = options?.speed ?? 1;
  const size = options?.size ?? 2;

  // Particles are initialized lazily on first render
  let particles: Array<{ x: number; y: number; vx: number; vy: number; alpha: number }> | null = null;
  let lastTime = 0;

  function initParticles(width: number, height: number): void {
    particles = [];
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * speed * 2,
        vy: (Math.random() - 0.5) * speed * 2,
        alpha: 0.2 + Math.random() * 0.8,
      });
    }
  }

  const render: BackgroundRenderFn = (ctx, time, width, height) => {
    if (!particles) {
      initParticles(width, height);
      lastTime = time;
    }

    const dt = Math.min((time - lastTime) / 16, 4); // cap delta
    lastTime = time;

    // Clear with dark background
    ctx.fillStyle = "rgba(0, 0, 0, 1)";
    ctx.fillRect(0, 0, width, height);

    const { r, g, b } = parseHexColor(color);

    for (const p of particles!) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      // Wrap around
      if (p.x < 0) p.x += width;
      if (p.x > width) p.x -= width;
      if (p.y < 0) p.y += height;
      if (p.y > height) p.y -= height;

      ctx.beginPath();
      ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${r},${g},${b},${p.alpha})`;
      ctx.fill();
    }
  };

  return { type: "canvas", render };
}

export interface GradientBgOptions {
  readonly colors?: readonly string[];
  readonly speed?: number;
  readonly angle?: number;
}

/** Animated gradient background */
export function gradientBg(options?: GradientBgOptions): BackgroundSource {
  const colors = options?.colors ?? ["#1a1a2e", "#16213e", "#0f3460"];
  const speed = options?.speed ?? 1;
  const baseAngle = options?.angle ?? 0;

  const render: BackgroundRenderFn = (ctx, time, width, height) => {
    const t = (time * speed) / 5000;
    const angle = baseAngle + t;

    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const halfDiag = Math.sqrt(width * width + height * height) / 2;
    const cx = width / 2;
    const cy = height / 2;

    const gradient = ctx.createLinearGradient(
      cx - cos * halfDiag,
      cy - sin * halfDiag,
      cx + cos * halfDiag,
      cy + sin * halfDiag,
    );

    for (let i = 0; i < colors.length; i++) {
      // Shift stop positions over time for animation
      const baseStop = i / (colors.length - 1);
      const shift = Math.sin(t * 2 + i) * 0.1;
      const stop = Math.max(0, Math.min(1, baseStop + shift));
      gradient.addColorStop(stop, colors[i]!);
    }

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  };

  return { type: "canvas", render };
}
