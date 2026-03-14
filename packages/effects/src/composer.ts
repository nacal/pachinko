import type {
  EffectOrComposite,
  SequenceComposite,
  ParallelComposite,
  StaggerComposite,
} from "./types";

export function sequence(...effects: EffectOrComposite[]): SequenceComposite {
  return { type: "sequence", effects };
}

export function parallel(...effects: EffectOrComposite[]): ParallelComposite {
  return { type: "parallel", effects };
}

export function stagger(delay: number, ...effects: EffectOrComposite[]): StaggerComposite {
  return { type: "stagger", delay, effects };
}
