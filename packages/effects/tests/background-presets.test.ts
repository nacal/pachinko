import { describe, it, expect, vi } from "vitest";
import { colorBg, imageBg, videoBg, canvasBg, particleBg, gradientBg } from "../src/background-presets.js";

describe("background presets", () => {
  it("colorBg creates color source", () => {
    const source = colorBg("#ff0000");
    expect(source).toEqual({ type: "color", color: "#ff0000" });
  });

  it("imageBg creates image source", () => {
    const image = {} as ImageBitmap;
    const source = imageBg(image);
    expect(source.type).toBe("image");
  });

  it("videoBg creates video source", () => {
    const video = {} as HTMLVideoElement;
    const source = videoBg(video);
    expect(source.type).toBe("video");
  });

  it("canvasBg creates canvas source", () => {
    const render = vi.fn();
    const source = canvasBg(render);
    expect(source.type).toBe("canvas");
    if (source.type === "canvas") {
      const ctx = {} as CanvasRenderingContext2D;
      source.render(ctx, 0, 100, 100);
      expect(render).toHaveBeenCalledWith(ctx, 0, 100, 100);
    }
  });

  it("particleBg creates canvas source with particles", () => {
    const source = particleBg({ count: 10, color: "#ff0000" });
    expect(source.type).toBe("canvas");
    if (source.type === "canvas") {
      const ctx = {
        fillStyle: "",
        fillRect: vi.fn(),
        beginPath: vi.fn(),
        arc: vi.fn(),
        fill: vi.fn(),
      } as unknown as CanvasRenderingContext2D;
      // Should not throw
      source.render(ctx, 0, 100, 100);
      source.render(ctx, 16, 100, 100);
      expect(ctx.beginPath).toHaveBeenCalled();
    }
  });

  it("gradientBg creates canvas source with gradient", () => {
    const source = gradientBg({ colors: ["#000", "#fff"], speed: 1 });
    expect(source.type).toBe("canvas");
    if (source.type === "canvas") {
      const gradient = { addColorStop: vi.fn() };
      const ctx = {
        fillStyle: "",
        fillRect: vi.fn(),
        createLinearGradient: vi.fn(() => gradient),
      } as unknown as CanvasRenderingContext2D;
      source.render(ctx, 0, 100, 100);
      expect(ctx.createLinearGradient).toHaveBeenCalled();
      expect(gradient.addColorStop).toHaveBeenCalledTimes(2);
    }
  });
});
