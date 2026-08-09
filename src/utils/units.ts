// ============================================================
// BEAMLAB — Unit Conversion Utilities
// All internal calculations in SI base units (N, m, N·m)
// ============================================================

import {
  LengthUnit,
  ForceUnit,
  MomentUnit,
  DistLoadUnit,
  UnitSystem,
} from '../types/beam';

// ============================================================
// Conversion factors TO base SI units
// ============================================================

const lengthToMeters: Record<LengthUnit, number> = {
  mm: 0.001,
  m: 1,
  ft: 0.3048,
  in: 0.0254,
};

const forceToNewtons: Record<ForceUnit, number> = {
  N: 1,
  kN: 1000,
  lb: 4.44822,
  kip: 4448.22,
};

const momentToNewtonMeters: Record<MomentUnit, number> = {
  'N·m': 1,
  'kN·m': 1000,
  'lb·ft': 1.35582,
  'kip·ft': 1355.82,
};

const distLoadToNewtonPerMeter: Record<DistLoadUnit, number> = {
  'N/m': 1,
  'kN/m': 1000,
  'lb/ft': 14.5939,
  'kip/ft': 14593.9,
};

// ============================================================
// Conversion functions
// ============================================================

export function convertLength(value: number, from: LengthUnit, to: LengthUnit): number {
  if (from === to) return value;
  const meters = value * lengthToMeters[from];
  return meters / lengthToMeters[to];
}

export function convertForce(value: number, from: ForceUnit, to: ForceUnit): number {
  if (from === to) return value;
  const newtons = value * forceToNewtons[from];
  return newtons / forceToNewtons[to];
}

export function convertMoment(value: number, from: MomentUnit, to: MomentUnit): number {
  if (from === to) return value;
  const nm = value * momentToNewtonMeters[from];
  return nm / momentToNewtonMeters[to];
}

export function convertDistLoad(value: number, from: DistLoadUnit, to: DistLoadUnit): number {
  if (from === to) return value;
  const npm = value * distLoadToNewtonPerMeter[from];
  return npm / distLoadToNewtonPerMeter[to];
}

// ============================================================
// To/from internal SI
// ============================================================

export function lengthToSI(value: number, unit: LengthUnit): number {
  return value * lengthToMeters[unit];
}

export function lengthFromSI(value: number, unit: LengthUnit): number {
  return value / lengthToMeters[unit];
}

export function forceToSI(value: number, unit: ForceUnit): number {
  return value * forceToNewtons[unit];
}

export function forceFromSI(value: number, unit: ForceUnit): number {
  return value / forceToNewtons[unit];
}

export function momentToSI(value: number, unit: MomentUnit): number {
  return value * momentToNewtonMeters[unit];
}

export function momentFromSI(value: number, unit: MomentUnit): number {
  return value / momentToNewtonMeters[unit];
}

export function distLoadToSI(value: number, unit: DistLoadUnit): number {
  return value * distLoadToNewtonPerMeter[unit];
}

export function distLoadFromSI(value: number, unit: DistLoadUnit): number {
  return value / distLoadToNewtonPerMeter[unit];
}

// ============================================================
// Unit labels and formatting
// ============================================================

export function getDefaultUnits(system: UnitSystem) {
  if (system === 'SI') {
    return {
      lengthUnit: 'm' as LengthUnit,
      forceUnit: 'kN' as ForceUnit,
      momentUnit: 'kN·m' as MomentUnit,
      distLoadUnit: 'kN/m' as DistLoadUnit,
    };
  }
  return {
    lengthUnit: 'ft' as LengthUnit,
    forceUnit: 'kip' as ForceUnit,
    momentUnit: 'kip·ft' as MomentUnit,
    distLoadUnit: 'kip/ft' as DistLoadUnit,
  };
}

export function formatValue(value: number, decimals: number = 2): string {
  if (Math.abs(value) < 1e-10) return '0';
  return value.toFixed(decimals).replace(/\.?0+$/, '') || '0';
}

export function formatWithUnit(value: number, unit: string, decimals: number = 2): string {
  return `${formatValue(value, decimals)} ${unit}`;
}
