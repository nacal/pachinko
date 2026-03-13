import type {
  EffectOrComposite,
  EffectPrimitive,
  Timeline,
  TimelineEntry,
} from "./types.js";
import { computeTotalDuration } from "./utils.js";

function isPrimitive(effect: EffectOrComposite): effect is EffectPrimitive {
  return effect.type !== "sequence" && effect.type !== "parallel" && effect.type !== "stagger";
}

function flattenEffects(effect: EffectOrComposite, offset: number): TimelineEntry[] {
  if (isPrimitive(effect)) {
    const startTime = offset + effect.timing.delay;
    const endTime = startTime + effect.timing.duration;
    return [{ effect, startTime, endTime }];
  }

  switch (effect.type) {
    case "parallel": {
      const entries: TimelineEntry[] = [];
      for (const child of effect.effects) {
        entries.push(...flattenEffects(child, offset));
      }
      return entries;
    }
    case "sequence": {
      const entries: TimelineEntry[] = [];
      let cursor = offset;
      for (const child of effect.effects) {
        const childEntries = flattenEffects(child, cursor);
        entries.push(...childEntries);
        const maxEnd = childEntries.reduce((max, e) => Math.max(max, e.endTime), cursor);
        cursor = maxEnd;
      }
      return entries;
    }
    case "stagger": {
      const entries: TimelineEntry[] = [];
      for (let i = 0; i < effect.effects.length; i++) {
        const child = effect.effects[i]!;
        entries.push(...flattenEffects(child, offset + i * effect.delay));
      }
      return entries;
    }
  }
}

export function buildTimeline(effects: readonly EffectOrComposite[]): Timeline {
  const allEntries: TimelineEntry[] = [];
  for (const effect of effects) {
    allEntries.push(...flattenEffects(effect, 0));
  }
  allEntries.sort((a, b) => a.startTime - b.startTime);
  const totalDuration = allEntries.reduce((max, e) => Math.max(max, e.endTime), 0);
  return { entries: allEntries, totalDuration };
}

export function getActiveEntries(timeline: Timeline, elapsed: number): Array<{ entry: TimelineEntry; progress: number }> {
  const active: Array<{ entry: TimelineEntry; progress: number }> = [];
  for (const entry of timeline.entries) {
    if (elapsed >= entry.startTime && elapsed < entry.endTime) {
      const duration = entry.endTime - entry.startTime;
      const progress = duration > 0 ? (elapsed - entry.startTime) / duration : 1;
      active.push({ entry, progress });
    }
  }
  return active;
}

export function computeEffectDuration(effect: EffectOrComposite): number {
  if (isPrimitive(effect)) {
    return computeTotalDuration(effect.timing);
  }

  switch (effect.type) {
    case "parallel": {
      let max = 0;
      for (const child of effect.effects) {
        max = Math.max(max, computeEffectDuration(child));
      }
      return max;
    }
    case "sequence": {
      let total = 0;
      for (const child of effect.effects) {
        total += computeEffectDuration(child);
      }
      return total;
    }
    case "stagger": {
      if (effect.effects.length === 0) return 0;
      const lastOffset = (effect.effects.length - 1) * effect.delay;
      const lastChild = effect.effects[effect.effects.length - 1]!;
      return lastOffset + computeEffectDuration(lastChild);
    }
  }
}
