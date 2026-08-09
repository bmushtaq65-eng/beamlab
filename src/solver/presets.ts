// ============================================================
// BEAMLAB — Beam Presets (Textbook Examples)
// ============================================================

import { BeamPreset } from '../types/beam';

let idCounter = 0;
function nextId(prefix: string = 'preset'): string {
  return `${prefix}-${++idCounter}`;
}

export const BEAM_PRESETS: BeamPreset[] = [
  // ========================================
  // SIMPLY SUPPORTED BEAMS
  // ========================================
  {
    id: 'ss-center-point',
    name: 'Center Point Load',
    description: 'Simply supported beam with center point load (10m, 20kN)',
    category: 'Simply Supported',
    model: {
      geometry: { length: 10 },
      supports: [
        { id: 's1', type: 'pin', position: 0 },
        { id: 's2', type: 'roller', position: 10 },
      ],
      loads: [
        { id: 'p1', type: 'point', magnitude: 20, position: 5, direction: 'down' },
      ],
      unitSystem: 'SI',
      lengthUnit: 'm',
      forceUnit: 'kN',
      momentUnit: 'kN·m',
      distLoadUnit: 'kN/m',
    },
  },
  {
    id: 'ss-full-udl',
    name: 'Full-Span UDL',
    description: 'Simply supported beam with full-span uniform load (10m, 5kN/m)',
    category: 'Simply Supported',
    model: {
      geometry: { length: 10 },
      supports: [
        { id: 's1', type: 'pin', position: 0 },
        { id: 's2', type: 'roller', position: 10 },
      ],
      loads: [
        { id: 'u1', type: 'distributed', shape: 'uniform', startMagnitude: 5, endMagnitude: 5, startPosition: 0, endPosition: 10, direction: 'down' },
      ],
      unitSystem: 'SI',
      lengthUnit: 'm',
      forceUnit: 'kN',
      momentUnit: 'kN·m',
      distLoadUnit: 'kN/m',
    },
  },
  {
    id: 'ss-multiple-point',
    name: 'Multiple Point Loads',
    description: 'Simply supported beam with two point loads (8m, 20kN + 15kN)',
    category: 'Simply Supported',
    model: {
      geometry: { length: 8 },
      supports: [
        { id: 's1', type: 'pin', position: 0 },
        { id: 's2', type: 'roller', position: 8 },
      ],
      loads: [
        { id: 'p1', type: 'point', magnitude: 20, position: 2, direction: 'down' },
        { id: 'p2', type: 'point', magnitude: 15, position: 6, direction: 'down' },
      ],
      unitSystem: 'SI',
      lengthUnit: 'm',
      forceUnit: 'kN',
      momentUnit: 'kN·m',
      distLoadUnit: 'kN/m',
    },
  },
  {
    id: 'ss-mixed',
    name: 'Mixed Loading',
    description: 'Simply supported beam with point loads, UDL, and moment (8m)',
    category: 'Simply Supported',
    model: {
      geometry: { length: 8 },
      supports: [
        { id: 's1', type: 'pin', position: 0 },
        { id: 's2', type: 'roller', position: 8 },
      ],
      loads: [
        { id: 'p1', type: 'point', magnitude: 20, position: 2, direction: 'down' },
        { id: 'p2', type: 'point', magnitude: 15, position: 6, direction: 'down' },
        { id: 'u1', type: 'distributed', shape: 'uniform', startMagnitude: 5, endMagnitude: 5, startPosition: 0, endPosition: 8, direction: 'down' },
        { id: 'm1', type: 'moment', magnitude: 10, position: 4, direction: 'clockwise' },
      ],
      unitSystem: 'SI',
      lengthUnit: 'm',
      forceUnit: 'kN',
      momentUnit: 'kN·m',
      distLoadUnit: 'kN/m',
    },
  },
  {
    id: 'ss-partial-udl',
    name: 'Partial UDL',
    description: 'Simply supported beam with partial UDL (10m, 8kN/m from 2-7m)',
    category: 'Simply Supported',
    model: {
      geometry: { length: 10 },
      supports: [
        { id: 's1', type: 'pin', position: 0 },
        { id: 's2', type: 'roller', position: 10 },
      ],
      loads: [
        { id: 'u1', type: 'distributed', shape: 'uniform', startMagnitude: 8, endMagnitude: 8, startPosition: 2, endPosition: 7, direction: 'down' },
      ],
      unitSystem: 'SI',
      lengthUnit: 'm',
      forceUnit: 'kN',
      momentUnit: 'kN·m',
      distLoadUnit: 'kN/m',
    },
  },

  // ========================================
  // CANTILEVER BEAMS
  // ========================================
  {
    id: 'cant-end-point',
    name: 'End Point Load',
    description: 'Cantilever with end point load (5m, 10kN)',
    category: 'Cantilever',
    model: {
      geometry: { length: 5 },
      supports: [
        { id: 's1', type: 'fixed', position: 0 },
      ],
      loads: [
        { id: 'p1', type: 'point', magnitude: 10, position: 5, direction: 'down' },
      ],
      unitSystem: 'SI',
      lengthUnit: 'm',
      forceUnit: 'kN',
      momentUnit: 'kN·m',
      distLoadUnit: 'kN/m',
    },
  },
  {
    id: 'cant-full-udl',
    name: 'Cantilever Full UDL',
    description: 'Cantilever with full-span UDL (5m, 4kN/m)',
    category: 'Cantilever',
    model: {
      geometry: { length: 5 },
      supports: [
        { id: 's1', type: 'fixed', position: 0 },
      ],
      loads: [
        { id: 'u1', type: 'distributed', shape: 'uniform', startMagnitude: 4, endMagnitude: 4, startPosition: 0, endPosition: 5, direction: 'down' },
      ],
      unitSystem: 'SI',
      lengthUnit: 'm',
      forceUnit: 'kN',
      momentUnit: 'kN·m',
      distLoadUnit: 'kN/m',
    },
  },
  {
    id: 'cant-end-moment',
    name: 'End Applied Moment',
    description: 'Cantilever with applied moment at free end (4m, 30kN·m)',
    category: 'Cantilever',
    model: {
      geometry: { length: 4 },
      supports: [
        { id: 's1', type: 'fixed', position: 0 },
      ],
      loads: [
        { id: 'm1', type: 'moment', magnitude: 30, position: 4, direction: 'clockwise' },
      ],
      unitSystem: 'SI',
      lengthUnit: 'm',
      forceUnit: 'kN',
      momentUnit: 'kN·m',
      distLoadUnit: 'kN/m',
    },
  },
  {
    id: 'cant-combined',
    name: 'Cantilever Combined',
    description: 'Cantilever with point load and UDL (6m)',
    category: 'Cantilever',
    model: {
      geometry: { length: 6 },
      supports: [
        { id: 's1', type: 'fixed', position: 0 },
      ],
      loads: [
        { id: 'p1', type: 'point', magnitude: 15, position: 6, direction: 'down' },
        { id: 'u1', type: 'distributed', shape: 'uniform', startMagnitude: 3, endMagnitude: 3, startPosition: 0, endPosition: 6, direction: 'down' },
      ],
      unitSystem: 'SI',
      lengthUnit: 'm',
      forceUnit: 'kN',
      momentUnit: 'kN·m',
      distLoadUnit: 'kN/m',
    },
  },

  // ========================================
  // OVERHANGING BEAMS
  // ========================================
  {
    id: 'overhang-right',
    name: 'Right Overhang',
    description: 'Beam with right overhang (12m, supports at 0 and 8m, load at 12m)',
    category: 'Overhanging',
    model: {
      geometry: { length: 12 },
      supports: [
        { id: 's1', type: 'pin', position: 0 },
        { id: 's2', type: 'roller', position: 8 },
      ],
      loads: [
        { id: 'p1', type: 'point', magnitude: 10, position: 12, direction: 'down' },
      ],
      unitSystem: 'SI',
      lengthUnit: 'm',
      forceUnit: 'kN',
      momentUnit: 'kN·m',
      distLoadUnit: 'kN/m',
    },
  },
  {
    id: 'overhang-both',
    name: 'Double Overhang with UDL',
    description: 'Beam with overhangs on both sides (14m, supports at 2 and 12m, full UDL)',
    category: 'Overhanging',
    model: {
      geometry: { length: 14 },
      supports: [
        { id: 's1', type: 'pin', position: 2 },
        { id: 's2', type: 'roller', position: 12 },
      ],
      loads: [
        { id: 'u1', type: 'distributed', shape: 'uniform', startMagnitude: 6, endMagnitude: 6, startPosition: 0, endPosition: 14, direction: 'down' },
      ],
      unitSystem: 'SI',
      lengthUnit: 'm',
      forceUnit: 'kN',
      momentUnit: 'kN·m',
      distLoadUnit: 'kN/m',
    },
  },

  // ========================================
  // TRIANGULAR / TRAPEZOIDAL LOADS
  // ========================================
  {
    id: 'ss-triangular',
    name: 'Triangular Load',
    description: 'Simply supported with triangular load (10m, 0 to 12 kN/m)',
    category: 'Simply Supported',
    model: {
      geometry: { length: 10 },
      supports: [
        { id: 's1', type: 'pin', position: 0 },
        { id: 's2', type: 'roller', position: 10 },
      ],
      loads: [
        { id: 'u1', type: 'distributed', shape: 'triangular', startMagnitude: 0, endMagnitude: 12, startPosition: 0, endPosition: 10, direction: 'down' },
      ],
      unitSystem: 'SI',
      lengthUnit: 'm',
      forceUnit: 'kN',
      momentUnit: 'kN·m',
      distLoadUnit: 'kN/m',
    },
  },
];

export function getPresetsByCategory(): Record<string, BeamPreset[]> {
  const categories: Record<string, BeamPreset[]> = {};
  for (const preset of BEAM_PRESETS) {
    if (!categories[preset.category]) {
      categories[preset.category] = [];
    }
    categories[preset.category].push(preset);
  }
  return categories;
}

export function getPresetById(id: string): BeamPreset | undefined {
  return BEAM_PRESETS.find(p => p.id === id);
}
