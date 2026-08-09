// ============================================================
// BEAMLAB — Core Type Definitions
// Structural Beam Analysis Engine
// ============================================================

/** Unit systems supported */
export type UnitSystem = 'SI' | 'Imperial';

/** Length units */
export type LengthUnit = 'mm' | 'm' | 'ft' | 'in';

/** Force units */
export type ForceUnit = 'N' | 'kN' | 'lb' | 'kip';

/** Moment units */
export type MomentUnit = 'N·m' | 'kN·m' | 'lb·ft' | 'kip·ft';

/** Distributed load units */
export type DistLoadUnit = 'N/m' | 'kN/m' | 'lb/ft' | 'kip/ft';

/** Support types */
export type SupportType = 'pin' | 'roller' | 'fixed';

/** Load direction */
export type LoadDirection = 'down' | 'up' | 'left' | 'right';

/** Moment direction */
export type MomentDirection = 'clockwise' | 'counterclockwise';

/** Distributed load shape */
export type DistLoadShape = 'uniform' | 'triangular' | 'trapezoidal';

/** Load types */
export type LoadType = 'point' | 'distributed' | 'moment';

// ============================================================
// Data Models
// ============================================================

export interface Support {
  id: string;
  type: SupportType;
  position: number; // in current length unit
}

export interface PointLoad {
  id: string;
  type: 'point';
  magnitude: number; // in current force unit
  position: number;  // in current length unit
  direction: LoadDirection;
}

export interface DistributedLoad {
  id: string;
  type: 'distributed';
  shape: DistLoadShape;
  startMagnitude: number; // in current dist load unit
  endMagnitude: number;   // for trapezoidal/triangular
  startPosition: number;
  endPosition: number;
  direction: LoadDirection;
}

export interface AppliedMoment {
  id: string;
  type: 'moment';
  magnitude: number; // in current moment unit
  position: number;
  direction: MomentDirection;
}

export type Load = PointLoad | DistributedLoad | AppliedMoment;

export interface BeamGeometry {
  length: number;
  width?: number;
  depth?: number;
  material?: string;
}

export interface BeamModel {
  id: string;
  name: string;
  geometry: BeamGeometry;
  supports: Support[];
  loads: Load[];
  unitSystem: UnitSystem;
  lengthUnit: LengthUnit;
  forceUnit: ForceUnit;
  momentUnit: MomentUnit;
  distLoadUnit: DistLoadUnit;
}

// ============================================================
// Analysis Results
// ============================================================

export interface SupportReaction {
  supportId: string;
  position: number;
  verticalForce: number;   // positive = upward
  horizontalForce: number; // positive = right
  moment: number;          // positive = counterclockwise
}

export interface DiagramPoint {
  x: number;
  value: number;
}

export interface CriticalPoint {
  x: number;
  value: number;
  label: string;
  type: 'max' | 'min' | 'zero' | 'discontinuity';
}

export interface PiecewiseSegment {
  startX: number;
  endX: number;
  equation: string;      // human-readable equation string
  equationLatex?: string; // LaTeX formatted
  coefficients: number[]; // polynomial coefficients [a0, a1, a2, ...]
  // V(x) or M(x) = a0 + a1*(x-startX) + a2*(x-startX)^2 + ...
}

export interface CalculationStep {
  title: string;
  description: string;
  equations: string[];
  result?: string;
  substeps?: CalculationStep[];
}

export interface ShearForceResult {
  diagram: DiagramPoint[];
  segments: PiecewiseSegment[];
  criticalPoints: CriticalPoint[];
  maxPositive: CriticalPoint | null;
  maxNegative: CriticalPoint | null;
  maxAbsolute: CriticalPoint | null;
  zeroPoints: CriticalPoint[];
}

export interface BendingMomentResult {
  diagram: DiagramPoint[];
  segments: PiecewiseSegment[];
  criticalPoints: CriticalPoint[];
  maxPositive: CriticalPoint | null;  // max sagging
  maxNegative: CriticalPoint | null;  // max hogging
  maxAbsolute: CriticalPoint | null;
}

export interface AnalysisResult {
  success: boolean;
  error?: string;
  isStaticallyDeterminate: boolean;
  reactions: SupportReaction[];
  shearForce: ShearForceResult;
  bendingMoment: BendingMomentResult;
  calculationSteps: CalculationStep[];
  signConvention: string;
}

// ============================================================
// Beam Presets
// ============================================================

export interface BeamPreset {
  id: string;
  name: string;
  description: string;
  category: string;
  model: Omit<BeamModel, 'id' | 'name'>;
}

// ============================================================
// Project
// ============================================================

export interface Project {
  id: string;
  name: string;
  description?: string;
  beamModel: BeamModel;
  analysisResult?: AnalysisResult;
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// Validation
// ============================================================

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}
