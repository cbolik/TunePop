export function calculatePoints(
  correct: boolean,
  elapsedMs: number,
  speedMode: boolean,
): number {
  if (!correct) return 0
  if (!speedMode) return 1
  return Math.max(100 - Math.floor(elapsedMs / 1000) * 10, 10)
}
