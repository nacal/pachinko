import { describe, it, expect } from "vitest";
import { isWorkerInMessage, isWorkerOutMessage } from "../src/messages";

describe("isWorkerInMessage", () => {
  it("returns true for valid spin message", () => {
    expect(isWorkerInMessage({ type: "spin", result: {} })).toBe(true);
  });

  it("returns true for valid skip message", () => {
    expect(isWorkerInMessage({ type: "skip" })).toBe(true);
  });

  it("returns true for valid resize message", () => {
    expect(isWorkerInMessage({ type: "resize", width: 100, height: 100 })).toBe(true);
  });

  it("returns true for valid destroy message", () => {
    expect(isWorkerInMessage({ type: "destroy" })).toBe(true);
  });

  it("returns false for null", () => {
    expect(isWorkerInMessage(null)).toBe(false);
  });

  it("returns false for non-object", () => {
    expect(isWorkerInMessage("spin")).toBe(false);
  });

  it("returns false for object without type", () => {
    expect(isWorkerInMessage({ data: "test" })).toBe(false);
  });

  it("returns false for object with non-string type", () => {
    expect(isWorkerInMessage({ type: 123 })).toBe(false);
  });
});

describe("isWorkerOutMessage", () => {
  it("returns true for valid ready message", () => {
    expect(isWorkerOutMessage({ type: "ready" })).toBe(true);
  });

  it("returns true for valid phase-change message", () => {
    expect(isWorkerOutMessage({ type: "phase-change", phase: "spinning" })).toBe(true);
  });

  it("returns true for valid complete message", () => {
    expect(isWorkerOutMessage({ type: "complete" })).toBe(true);
  });

  it("returns false for null", () => {
    expect(isWorkerOutMessage(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isWorkerOutMessage(undefined)).toBe(false);
  });
});
