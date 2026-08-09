// ============================================================
// BEAMLAB — ID Generator & Utility Functions
// ============================================================

let _counter = Date.now();

export function generateId(prefix: string = ''): string {
  _counter++;
  const random = Math.random().toString(36).substring(2, 8);
  return prefix ? `${prefix}-${random}${_counter.toString(36).slice(-4)}` : `${random}${_counter.toString(36).slice(-4)}`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function roundTo(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

export function snapToGrid(value: number, gridSize: number): number {
  return Math.round(value / gridSize) * gridSize;
}
