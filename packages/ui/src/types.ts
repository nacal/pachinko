// ─── Chart Style ───

export interface ChartStyle {
  readonly backgroundColor: string;
  readonly textColor: string;
  readonly axisColor: string;
  readonly gridColor: string;
  readonly lineColor: string;
  readonly positiveColor: string;
  readonly negativeColor: string;
  readonly font: string;
  readonly titleFont: string;
  readonly labelFont: string;
  readonly bonusColors: Readonly<Record<string, string>>;
  readonly defaultBonusColor: string;
}

// ─── Layout ───

export interface Padding {
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly left: number;
}

// ─── Color Renderer ───

export type ColorRenderer = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  time: number,
) => void;
