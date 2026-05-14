export function slopeFactorFromRatio(x: number, base = 12): number {
  return Math.sqrt(1 + (x / base) ** 2)
}

export function slopeFactorFromDegrees(deg: number): number {
  return 1 / Math.cos((deg * Math.PI) / 180)
}

export function slopeFactorFromPercent(pct: number): number {
  return Math.sqrt(1 + (pct / 100) ** 2)
}
