import type { ReserveEntry, ReserveQueue } from "./types";

export function createReserveQueue(maxSize: number = 4): ReserveQueue {
  const items: ReserveEntry[] = [];

  return {
    enqueue(entry: ReserveEntry): boolean {
      if (items.length >= maxSize) return false;
      items.push(entry);
      return true;
    },

    dequeue(): ReserveEntry | undefined {
      return items.shift();
    },

    peek(): ReserveEntry | undefined {
      return items[0];
    },

    entries(): readonly ReserveEntry[] {
      return [...items];
    },

    size(): number {
      return items.length;
    },

    isFull(): boolean {
      return items.length >= maxSize;
    },

    clear(): void {
      items.length = 0;
    },

    patchEntry(index: number, updater: (entry: ReserveEntry) => ReserveEntry): void {
      if (index < 0 || index >= items.length) return;
      items[index] = updater(items[index]!);
    },
  };
}
