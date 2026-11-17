// PR 1a keeps only what the HUD view needs. Task 14.3 adds the rest of the module.

export interface MeterView {
  line: string;
  share: number;
  haunted: number;
  total: number;
}

/** The CSS transform of the Haunt_Meter bar: share clamped to 0..1, 4 decimals. */
export function meterScale(share: number): string {
  const clamped = Number.isNaN(share) ? 0 : Math.min(1, Math.max(0, share));
  return `scaleX(${clamped.toFixed(4)})`;
}
