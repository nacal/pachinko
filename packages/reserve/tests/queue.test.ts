import { describe, it, expect } from "vitest";
import { createReserveQueue } from "../src/queue";
import type { ReserveEntry } from "../src/types";

function makeEntry(id: number, color: string = "white"): ReserveEntry {
  return {
    id,
    color,
    drawResult: {
      rawValue: 0,
      outcome: "hazure",
      bonusType: null,
      reels: {
        left: { id: "1", label: "1", isKakuhen: false },
        center: { id: "2", label: "2", isKakuhen: false },
        right: { id: "3", label: "3", isKakuhen: false },
      },
      isReach: false,
      previousState: { mode: "normal", remainingSpins: null, consecutiveBonuses: 0 },
      nextState: { mode: "normal", remainingSpins: null, consecutiveBonuses: 0 },
    },
  };
}

describe("createReserveQueue", () => {
  it("starts empty", () => {
    const queue = createReserveQueue();
    expect(queue.size()).toBe(0);
    expect(queue.isFull()).toBe(false);
    expect(queue.entries()).toEqual([]);
    expect(queue.peek()).toBeUndefined();
  });

  it("enqueues and dequeues in FIFO order", () => {
    const queue = createReserveQueue();
    queue.enqueue(makeEntry(1, "white"));
    queue.enqueue(makeEntry(2, "red"));
    queue.enqueue(makeEntry(3, "gold"));

    expect(queue.size()).toBe(3);
    expect(queue.peek()!.id).toBe(1);

    const first = queue.dequeue()!;
    expect(first.id).toBe(1);
    expect(queue.size()).toBe(2);

    const second = queue.dequeue()!;
    expect(second.id).toBe(2);
  });

  it("respects max size (default 4)", () => {
    const queue = createReserveQueue();
    expect(queue.enqueue(makeEntry(1))).toBe(true);
    expect(queue.enqueue(makeEntry(2))).toBe(true);
    expect(queue.enqueue(makeEntry(3))).toBe(true);
    expect(queue.enqueue(makeEntry(4))).toBe(true);
    expect(queue.isFull()).toBe(true);
    expect(queue.enqueue(makeEntry(5))).toBe(false);
    expect(queue.size()).toBe(4);
  });

  it("supports custom max size", () => {
    const queue = createReserveQueue(2);
    queue.enqueue(makeEntry(1));
    queue.enqueue(makeEntry(2));
    expect(queue.isFull()).toBe(true);
    expect(queue.enqueue(makeEntry(3))).toBe(false);
  });

  it("dequeue from empty returns undefined", () => {
    const queue = createReserveQueue();
    expect(queue.dequeue()).toBeUndefined();
  });

  it("clear empties the queue", () => {
    const queue = createReserveQueue();
    queue.enqueue(makeEntry(1));
    queue.enqueue(makeEntry(2));
    queue.clear();
    expect(queue.size()).toBe(0);
    expect(queue.isFull()).toBe(false);
  });

  it("entries returns a copy", () => {
    const queue = createReserveQueue();
    queue.enqueue(makeEntry(1));
    const entries = queue.entries();
    expect(entries).toHaveLength(1);
    // Mutating the returned array should not affect the queue
    (entries as ReserveEntry[]).push(makeEntry(99));
    expect(queue.size()).toBe(1);
  });
});
