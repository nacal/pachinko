import { describe, it, expect } from "vitest";
import { flash, textOverlay, backgroundChange, shake, fade, custom } from "../src/primitives";

describe("flash", () => {
  it("creates with defaults", () => {
    const f = flash();
    expect(f.type).toBe("flash");
    expect(f.color).toBe("#ffffff");
    expect(f.opacity).toBe(0.8);
    expect(f.count).toBe(1);
    expect(f.timing.delay).toBe(0);
    expect(f.timing.duration).toBe(300);
  });

  it("creates with custom options", () => {
    const f = flash({ color: "#ff0000", opacity: 0.5, count: 3, timing: { delay: 100, duration: 500 } });
    expect(f.color).toBe("#ff0000");
    expect(f.opacity).toBe(0.5);
    expect(f.count).toBe(3);
    expect(f.timing.delay).toBe(100);
    expect(f.timing.duration).toBe(500);
  });
});

describe("textOverlay", () => {
  it("creates with defaults", () => {
    const t = textOverlay("test");
    expect(t.type).toBe("textOverlay");
    expect(t.text).toBe("test");
    expect(t.font).toBe("bold 48px sans-serif");
    expect(t.color).toBe("#ffffff");
    expect(t.position).toEqual({ x: 0.5, y: 0.5 });
    expect(t.fadeIn).toBe(200);
    expect(t.fadeOut).toBe(200);
  });

  it("creates with custom options", () => {
    const t = textOverlay("大当り!", {
      font: "bold 72px serif",
      color: "#ffd700",
      position: { x: 0.5, y: 0.3 },
      timing: { delay: 50, duration: 2000 },
      fadeIn: 300,
      fadeOut: 500,
    });
    expect(t.text).toBe("大当り!");
    expect(t.font).toBe("bold 72px serif");
    expect(t.position).toEqual({ x: 0.5, y: 0.3 });
    expect(t.timing.delay).toBe(50);
    expect(t.fadeIn).toBe(300);
    expect(t.fadeOut).toBe(500);
  });
});

describe("backgroundChange", () => {
  it("creates with defaults", () => {
    const b = backgroundChange();
    expect(b.type).toBe("backgroundChange");
    expect(b.fromColor).toBe("#000000");
    expect(b.toColor).toBe("#330000");
  });
});

describe("shake", () => {
  it("creates with defaults", () => {
    const s = shake();
    expect(s.type).toBe("shake");
    expect(s.intensity).toBe(8);
    expect(s.frequency).toBe(30);
  });

  it("creates with custom options", () => {
    const s = shake({ intensity: 15, frequency: 50 });
    expect(s.intensity).toBe(15);
    expect(s.frequency).toBe(50);
  });
});

describe("fade", () => {
  it("creates with defaults", () => {
    const f = fade();
    expect(f.type).toBe("fade");
    expect(f.direction).toBe("out");
    expect(f.color).toBe("#000000");
  });

  it("creates fade-in", () => {
    const f = fade({ direction: "in" });
    expect(f.direction).toBe("in");
  });
});

describe("custom", () => {
  it("creates with render function", () => {
    const render = () => {};
    const c = custom(render);
    expect(c.type).toBe("custom");
    expect(c.render).toBe(render);
    expect(c.timing.duration).toBe(1000);
  });
});
