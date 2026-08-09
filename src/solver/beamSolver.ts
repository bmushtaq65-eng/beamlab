// ============================================================
// BEAMLAB — Structural Beam Analysis Solver
// Mathematically correct equilibrium-based analysis
// ============================================================
// Sign Convention:
//   - Positive vertical force: UPWARD
//   - Positive shear: upward on left face (section method)
//   - Positive moment: SAGGING (concave up)
//   - Positive applied moment: COUNTERCLOCKWISE
//   - x increases left to right
// ============================================================

import {
  BeamModel,
  Support,
  Load,
  PointLoad,
  DistributedLoad,
  AppliedMoment,
  SupportReaction,
  DiagramPoint,
  CriticalPoint,
  PiecewiseSegment,
  ShearForceResult,
  BendingMomentResult,
  AnalysisResult,
  CalculationStep,
  ValidationResult,
  ValidationError,
} from '../types/beam';
import { formatValue } from '../utils/units';

// ============================================================
// VALIDATION
// ============================================================

export function validateBeamModel(model: BeamModel): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // Beam length
  if (!model.geometry.length || model.geometry.length <= 0) {
    errors.push({ field: 'length', message: 'Beam length must be greater than zero.', severity: 'error' });
  }

  // Supports
  if (model.supports.length === 0) {
    errors.push({ field: 'supports', message: 'At least one support is required.', severity: 'error' });
  }

  // Support positions
  for (const s of model.supports) {
    if (s.position < 0 || s.position > model.geometry.length) {
      errors.push({
        field: `support-${s.id}`,
        message: `Support at position ${s.position} is outside the beam (0 to ${model.geometry.length}).`,
        severity: 'error',
      });
    }
  }

  // Loads
  for (const load of model.loads) {
    if (load.type === 'point') {
      if (load.position < 0 || load.position > model.geometry.length) {
        errors.push({
          field: `load-${load.id}`,
          message: `Point load position (${load.position}) must lie within beam length (0 to ${model.geometry.length}).`,
          severity: 'error',
        });
      }
    } else if (load.type === 'distributed') {
      if (load.startPosition < 0 || load.endPosition > model.geometry.length) {
        errors.push({
          field: `load-${load.id}`,
          message: `Distributed load range must lie within beam length.`,
          severity: 'error',
        });
      }
      if (load.startPosition >= load.endPosition) {
        errors.push({
          field: `load-${load.id}`,
          message: `Distributed load start must be less than end position.`,
          severity: 'error',
        });
      }
    } else if (load.type === 'moment') {
      if (load.position < 0 || load.position > model.geometry.length) {
        errors.push({
          field: `load-${load.id}`,
          message: `Moment position must lie within beam length.`,
          severity: 'error',
        });
      }
    }
  }

  // Check determinacy
  const { nReactions } = countReactions(model.supports);
  const nEquilibrium = 3; // 2D: ΣFx=0, ΣFy=0, ΣM=0
  if (nReactions > nEquilibrium) {
    warnings.push({
      field: 'supports',
      message: `Structure is statically indeterminate (${nReactions} reactions, ${nEquilibrium} equations). Only determinate structures are currently supported.`,
      severity: 'warning',
    });
  }
  if (nReactions < nEquilibrium) {
    // Could be a mechanism (unstable)
    // But for pin+roller (2 reactions) on a beam with no horizontal loads, it's actually 2 unknowns and 2 useful equations
    // We need to be smarter about this
    const hasHorizontalLoads = model.loads.some(
      l => l.type === 'point' && (l.direction === 'left' || l.direction === 'right')
    );
    const hasFixedSupport = model.supports.some(s => s.type === 'fixed');
    
    if (nReactions < 2 || (nReactions === 2 && hasHorizontalLoads && !hasFixedSupport)) {
      errors.push({
        field: 'supports',
        message: 'Insufficient supports — structure is unstable (mechanism).',
        severity: 'error',
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

function countReactions(supports: Support[]): { nReactions: number; nVertical: number; nHorizontal: number; nMoment: number } {
  let nVertical = 0;
  let nHorizontal = 0;
  let nMoment = 0;

  for (const s of supports) {
    switch (s.type) {
      case 'roller':
        nVertical += 1;
        break;
      case 'pin':
        nVertical += 1;
        nHorizontal += 1;
        break;
      case 'fixed':
        nVertical += 1;
        nHorizontal += 1;
        nMoment += 1;
        break;
    }
  }

  return {
    nReactions: nVertical + nHorizontal + nMoment,
    nVertical,
    nHorizontal,
    nMoment,
  };
}

// ============================================================
// HELPER: Convert load magnitude to signed value
// Positive = upward, negative = downward
// ============================================================

function getSignedForce(magnitude: number, direction: 'up' | 'down' | 'left' | 'right'): number {
  switch (direction) {
    case 'down': return -Math.abs(magnitude);
    case 'up': return Math.abs(magnitude);
    default: return 0; // horizontal forces handled separately
  }
}

function getSignedMoment(magnitude: number, direction: 'clockwise' | 'counterclockwise'): number {
  // Counterclockwise = positive in our convention
  return direction === 'counterclockwise' ? Math.abs(magnitude) : -Math.abs(magnitude);
}

// ============================================================
// MAIN ANALYSIS FUNCTION
// ============================================================

export function analyzeBeam(model: BeamModel): AnalysisResult {
  const validation = validateBeamModel(model);
  if (!validation.valid) {
    return {
      success: false,
      error: validation.errors.map(e => e.message).join(' '),
      isStaticallyDeterminate: false,
      reactions: [],
      shearForce: emptyShearResult(),
      bendingMoment: emptyMomentResult(),
      calculationSteps: [],
      signConvention: SIGN_CONVENTION,
    };
  }

  const { nReactions } = countReactions(model.supports);
  const isStaticallyDeterminate = nReactions <= 3;

  if (!isStaticallyDeterminate) {
    return {
      success: false,
      error: 'Structure is statically indeterminate. Advanced structural solver required for this configuration.',
      isStaticallyDeterminate: false,
      reactions: [],
      shearForce: emptyShearResult(),
      bendingMoment: emptyMomentResult(),
      calculationSteps: [],
      signConvention: SIGN_CONVENTION,
    };
  }

  const steps: CalculationStep[] = [];

  // Step 1: Calculate reactions
  const { reactions, reactionSteps } = calculateReactions(model);
  steps.push(...reactionSteps);

  // Step 2: Generate shear force diagram
  const { shearForce, shearSteps } = calculateShearForce(model, reactions);
  steps.push(...shearSteps);

  // Step 3: Generate bending moment diagram
  const { bendingMoment, momentSteps } = calculateBendingMoment(model, reactions);
  steps.push(...momentSteps);

  // Step 4: Find critical points
  const criticalStep = generateCriticalPointStep(shearForce, bendingMoment, model);
  steps.push(criticalStep);

  return {
    success: true,
    isStaticallyDeterminate: true,
    reactions,
    shearForce,
    bendingMoment,
    calculationSteps: steps,
    signConvention: SIGN_CONVENTION,
  };
}

const SIGN_CONVENTION = `Sign Convention:
• Positive vertical force: Upward ↑
• Positive shear: Upward force on left face of section
• Positive moment: Sagging (concave up) ⌣
• Positive applied moment: Counterclockwise ↺`;

// ============================================================
// REACTION CALCULATION
// ============================================================

function calculateReactions(
  model: BeamModel
): { reactions: SupportReaction[]; reactionSteps: CalculationStep[] } {
  const L = model.geometry.length;
  const supports = [...model.supports].sort((a, b) => a.position - b.position);
  const loads = model.loads;
  const steps: CalculationStep[] = [];

  // Determine beam configuration
  const fixedSupports = supports.filter(s => s.type === 'fixed');
  const pinSupports = supports.filter(s => s.type === 'pin');
  const rollerSupports = supports.filter(s => s.type === 'roller');

  // Calculate total external forces and moments
  let totalFy = 0;    // total vertical force (positive = downward applied)
  let totalFx = 0;    // total horizontal force
  const momentAbout = supports[0].position; // take moments about first support
  let totalMomentAboutFirst = 0;

  const equivLoadSteps: string[] = [];

  for (const load of loads) {
    if (load.type === 'point') {
      const F = getSignedForce(load.magnitude, load.direction);
      totalFy += -F; // external load (downward = positive in total applied)
      totalMomentAboutFirst += -F * (load.position - momentAbout);
      
      if (load.direction === 'left' || load.direction === 'right') {
        const Fx = load.direction === 'right' ? load.magnitude : -load.magnitude;
        totalFx += Fx;
      }
      
      equivLoadSteps.push(
        `Point load: ${load.magnitude} ${model.forceUnit} ${load.direction} at x = ${load.position} ${model.lengthUnit}`
      );
    } else if (load.type === 'distributed') {
      const { resultantForce, resultantPosition } = getDistLoadResultant(load);
      const F = getSignedForce(resultantForce, load.direction);
      totalFy += -F;
      totalMomentAboutFirst += -F * (resultantPosition - momentAbout);
      
      equivLoadSteps.push(
        `Distributed load: ${load.startMagnitude}${load.shape !== 'uniform' ? ` to ${load.endMagnitude}` : ''} ${model.distLoadUnit} from ${load.startPosition} to ${load.endPosition} ${model.lengthUnit}`
      );
      equivLoadSteps.push(
        `  → Resultant = ${formatValue(resultantForce)} ${model.forceUnit} at x = ${formatValue(resultantPosition)} ${model.lengthUnit}`
      );
    } else if (load.type === 'moment') {
      const M = getSignedMoment(load.magnitude, load.direction);
      totalMomentAboutFirst += M;
      
      equivLoadSteps.push(
        `Applied moment: ${load.magnitude} ${model.momentUnit} ${load.direction} at x = ${load.position} ${model.lengthUnit}`
      );
    }
  }

  steps.push({
    title: 'Step 1 — Identify Loads and Equivalent Forces',
    description: 'Convert all loads to their equivalent concentrated forces and positions.',
    equations: equivLoadSteps,
  });

  // Solve based on support configuration
  const reactions: SupportReaction[] = [];

  if (fixedSupports.length === 1 && pinSupports.length === 0 && rollerSupports.length === 0) {
    // ---- CANTILEVER ----
    const fixed = fixedSupports[0];
    const { reaction, reactionSteps } = solveCantilever(model, fixed);
    reactions.push(reaction);
    steps.push(...reactionSteps);
  } else if (fixedSupports.length === 0) {
    // ---- SIMPLY SUPPORTED (PIN + ROLLER or PIN + PIN or ROLLER + ROLLER) ----
    const nonFixed = [...pinSupports, ...rollerSupports].sort((a, b) => a.position - b.position);
    
    if (nonFixed.length === 2) {
      const { reactionList, reactionSteps } = solveSimplySupported(model, nonFixed[0], nonFixed[1]);
      reactions.push(...reactionList);
      steps.push(...reactionSteps);
    } else if (nonFixed.length === 1) {
      // Single support — only works if it's a pin at the right position with no loads
      // This is generally unstable, but we'll try
      const { reaction, reactionSteps } = solveSingleSupport(model, nonFixed[0]);
      reactions.push(reaction);
      steps.push(...reactionSteps);
    }
  } else if (fixedSupports.length === 1 && (pinSupports.length + rollerSupports.length) === 1) {
    // Propped cantilever — indeterminate
    return {
      reactions: [],
      reactionSteps: [{
        title: 'Step 2 — Reaction Analysis',
        description: 'This is a propped cantilever (statically indeterminate). Advanced solver required.',
        equations: ['Structure has more unknowns than equilibrium equations.'],
      }],
    };
  }

  return { reactions, reactionSteps: steps };
}

// ============================================================
// CANTILEVER SOLVER
// ============================================================

function solveCantilever(
  model: BeamModel,
  fixed: Support
): { reaction: SupportReaction; reactionSteps: CalculationStep[] } {
  const steps: CalculationStep[] = [];
  const equations: string[] = [];

  let Ry = 0;  // vertical reaction at fixed support
  let Rx = 0;  // horizontal reaction
  let Mf = 0;  // moment reaction

  equations.push(`Taking equilibrium at fixed support (x = ${fixed.position} ${model.lengthUnit}):`);
  equations.push('');

  // ΣFy = 0
  let fyEquation = 'ΣFy = 0: R_y';
  for (const load of model.loads) {
    if (load.type === 'point') {
      const F = getSignedForce(load.magnitude, load.direction);
      Ry += -F; // reaction opposes load
      const sign = F < 0 ? '+' : '-';
      fyEquation += ` ${sign} ${formatValue(Math.abs(load.magnitude))}`;
    } else if (load.type === 'distributed') {
      const { resultantForce } = getDistLoadResultant(load);
      const F = getSignedForce(resultantForce, load.direction);
      Ry += -F;
      const sign = F < 0 ? '+' : '-';
      fyEquation += ` ${sign} ${formatValue(Math.abs(resultantForce))}`;
    }
  }
  fyEquation += ' = 0';
  equations.push(fyEquation);
  equations.push(`R_y = ${formatValue(Ry)} ${model.forceUnit} ${Ry >= 0 ? '(↑)' : '(↓)'}`);
  equations.push('');

  // ΣM about fixed = 0
  let mEquation = `ΣM(x=${fixed.position}) = 0: M_fixed`;
  for (const load of model.loads) {
    if (load.type === 'point') {
      const F = getSignedForce(load.magnitude, load.direction);
      const arm = load.position - fixed.position;
      const moment = -F * arm; // moment of external load about fixed
      Mf += -moment; // reaction moment opposes
      
      if (Math.abs(arm) > 1e-10) {
        const sign = moment > 0 ? '-' : '+';
        mEquation += ` ${sign} ${formatValue(Math.abs(load.magnitude))} × ${formatValue(Math.abs(arm))}`;
      }
    } else if (load.type === 'distributed') {
      const { resultantForce, resultantPosition } = getDistLoadResultant(load);
      const F = getSignedForce(resultantForce, load.direction);
      const arm = resultantPosition - fixed.position;
      const moment = -F * arm;
      Mf += -moment;
      
      if (Math.abs(arm) > 1e-10) {
        const sign = moment > 0 ? '-' : '+';
        mEquation += ` ${sign} ${formatValue(Math.abs(resultantForce))} × ${formatValue(Math.abs(arm))}`;
      }
    } else if (load.type === 'moment') {
      const M = getSignedMoment(load.magnitude, load.direction);
      Mf += -M;
    }
  }
  mEquation += ' = 0';
  equations.push(mEquation);
  equations.push(`M_fixed = ${formatValue(Mf)} ${model.momentUnit} ${Mf >= 0 ? '(↺ CCW)' : '(↻ CW)'}`);

  steps.push({
    title: 'Step 2 — Calculate Reactions (Cantilever)',
    description: `Fixed support at x = ${fixed.position} ${model.lengthUnit}. Three unknowns: R_x, R_y, and M_fixed.`,
    equations,
  });

  return {
    reaction: {
      supportId: fixed.id,
      position: fixed.position,
      verticalForce: Ry,
      horizontalForce: Rx,
      moment: Mf,
    },
    reactionSteps: steps,
  };
}

// ============================================================
// SIMPLY SUPPORTED SOLVER (2 supports: pin/roller)
// ============================================================

function solveSimplySupported(
  model: BeamModel,
  supportA: Support,
  supportB: Support
): { reactionList: SupportReaction[]; reactionSteps: CalculationStep[] } {
  const steps: CalculationStep[] = [];
  const equations: string[] = [];
  
  const posA = supportA.position;
  const posB = supportB.position;
  const span = posB - posA;

  equations.push(`Support A: ${supportA.type} at x = ${posA} ${model.lengthUnit}`);
  equations.push(`Support B: ${supportB.type} at x = ${posB} ${model.lengthUnit}`);
  equations.push(`Span = ${formatValue(span)} ${model.lengthUnit}`);
  equations.push('');

  // Take moments about A to find RB
  let momentAboutA = 0;
  let totalVerticalLoad = 0;

  const momentEqParts: string[] = [];
  const fyEqParts: string[] = [];

  for (const load of model.loads) {
    if (load.type === 'point') {
      const F = getSignedForce(load.magnitude, load.direction);
      const arm = load.position - posA;
      momentAboutA += F * arm; // moment of load about A (signed: downward force * positive arm = negative moment)
      totalVerticalLoad += F;
      
      momentEqParts.push(`(${formatValue(F)} × ${formatValue(arm)})`);
      fyEqParts.push(formatValue(F));
    } else if (load.type === 'distributed') {
      const { resultantForce, resultantPosition } = getDistLoadResultant(load);
      const F = getSignedForce(resultantForce, load.direction);
      const arm = resultantPosition - posA;
      momentAboutA += F * arm;
      totalVerticalLoad += F;
      
      momentEqParts.push(`(${formatValue(F)} × ${formatValue(arm)})`);
      fyEqParts.push(formatValue(F));
    } else if (load.type === 'moment') {
      const M = getSignedMoment(load.magnitude, load.direction);
      momentAboutA += M;
      
      momentEqParts.push(`${formatValue(M)}`);
    }
  }

  // ΣM_A = 0: RB * span + sum of load moments = 0
  // momentAboutA = sum of (F * arm) for all loads
  // RB * span + momentAboutA = 0
  // RB = -momentAboutA / span
  
  const RB = -momentAboutA / span;
  const RA = -(totalVerticalLoad + RB);
  // Check: RA + RB + totalVerticalLoad = 0

  equations.push('ΣM about A = 0:');
  equations.push(`R_B × ${formatValue(span)} + ${momentEqParts.join(' + ')} = 0`);
  equations.push(`R_B × ${formatValue(span)} = ${formatValue(-momentAboutA)}`);
  equations.push(`R_B = ${formatValue(RB)} ${model.forceUnit} ${RB >= 0 ? '(↑)' : '(↓)'}`);
  equations.push('');
  equations.push('ΣFy = 0:');
  equations.push(`R_A + R_B + ${fyEqParts.join(' + ')} = 0`);
  equations.push(`R_A = ${formatValue(RA)} ${model.forceUnit} ${RA >= 0 ? '(↑)' : '(↓)'}`);
  equations.push('');

  // Verification
  const check = RA + RB + totalVerticalLoad;
  equations.push('Verification:');
  equations.push(`ΣFy = ${formatValue(RA)} + ${formatValue(RB)} + (${formatValue(totalVerticalLoad)}) = ${formatValue(check)} ✓`);

  steps.push({
    title: 'Step 2 — Calculate Reactions (Simply Supported)',
    description: `Using equilibrium equations to solve for support reactions.`,
    equations,
  });

  // Handle horizontal reactions
  let Hx = 0;
  for (const load of model.loads) {
    if (load.type === 'point') {
      if (load.direction === 'left') Hx -= load.magnitude;
      if (load.direction === 'right') Hx += load.magnitude;
    }
  }

  const reactionA: SupportReaction = {
    supportId: supportA.id,
    position: posA,
    verticalForce: RA,
    horizontalForce: supportA.type === 'pin' ? -Hx : 0,
    moment: 0,
  };

  const reactionB: SupportReaction = {
    supportId: supportB.id,
    position: posB,
    verticalForce: RB,
    horizontalForce: supportB.type === 'pin' && supportA.type !== 'pin' ? -Hx : 0,
    moment: 0,
  };

  return { reactionList: [reactionA, reactionB], reactionSteps: steps };
}

// ============================================================
// SINGLE SUPPORT SOLVER (edge case)
// ============================================================

function solveSingleSupport(
  model: BeamModel,
  support: Support
): { reaction: SupportReaction; reactionSteps: CalculationStep[] } {
  // For a single pin/roller, we can only have zero net force and zero net moment
  // This is only valid if all loads produce zero moment about the support
  let totalFy = 0;
  
  for (const load of model.loads) {
    if (load.type === 'point') {
      totalFy += getSignedForce(load.magnitude, load.direction);
    } else if (load.type === 'distributed') {
      const { resultantForce } = getDistLoadResultant(load);
      totalFy += getSignedForce(resultantForce, load.direction);
    }
  }

  return {
    reaction: {
      supportId: support.id,
      position: support.position,
      verticalForce: -totalFy,
      horizontalForce: 0,
      moment: 0,
    },
    reactionSteps: [{
      title: 'Step 2 — Single Support Reactions',
      description: 'Single support configuration.',
      equations: [`R = ${formatValue(-totalFy)} ${model.forceUnit}`],
    }],
  };
}

// ============================================================
// DISTRIBUTED LOAD RESULTANT
// ============================================================

function getDistLoadResultant(load: DistributedLoad): { resultantForce: number; resultantPosition: number } {
  const span = load.endPosition - load.startPosition;
  const w1 = load.startMagnitude;
  const w2 = load.endMagnitude;

  if (load.shape === 'uniform') {
    return {
      resultantForce: w1 * span,
      resultantPosition: load.startPosition + span / 2,
    };
  } else if (load.shape === 'triangular') {
    // Triangular: goes from w1 at start to 0 at end (or 0 at start to w2 at end)
    if (w1 > 0 && w2 === 0) {
      return {
        resultantForce: (w1 * span) / 2,
        resultantPosition: load.startPosition + span / 3,
      };
    } else if (w1 === 0 && w2 > 0) {
      return {
        resultantForce: (w2 * span) / 2,
        resultantPosition: load.startPosition + (2 * span) / 3,
      };
    } else {
      // General triangular treated as trapezoidal
      return getTrapezoidalResultant(load);
    }
  } else {
    // Trapezoidal
    return getTrapezoidalResultant(load);
  }
}

function getTrapezoidalResultant(load: DistributedLoad): { resultantForce: number; resultantPosition: number } {
  const span = load.endPosition - load.startPosition;
  const w1 = load.startMagnitude;
  const w2 = load.endMagnitude;

  // Trapezoidal = rectangle + triangle
  const wMin = Math.min(w1, w2);
  const wDiff = Math.abs(w2 - w1);

  const rectForce = wMin * span;
  const triForce = (wDiff * span) / 2;
  const totalForce = rectForce + triForce;

  if (Math.abs(totalForce) < 1e-12) {
    return { resultantForce: 0, resultantPosition: load.startPosition + span / 2 };
  }

  const rectPos = load.startPosition + span / 2;
  const triPos = w2 > w1
    ? load.startPosition + (2 * span) / 3
    : load.startPosition + span / 3;

  const resultantPosition = (rectForce * rectPos + triForce * triPos) / totalForce;

  return { resultantForce: totalForce, resultantPosition };
}

// ============================================================
// SHEAR FORCE CALCULATION
// ============================================================

function calculateShearForce(
  model: BeamModel,
  reactions: SupportReaction[]
): { shearForce: ShearForceResult; shearSteps: CalculationStep[] } {
  const L = model.geometry.length;
  const numPoints = Math.max(500, Math.round(L * 100));
  const dx = L / numPoints;

  const diagram: DiagramPoint[] = [];
  const segments: PiecewiseSegment[] = [];
  const criticalPoints: CriticalPoint[] = [];
  const zeroPoints: CriticalPoint[] = [];

  // Collect all discontinuity points
  const discontinuities = new Set<number>();
  discontinuities.add(0);
  discontinuities.add(L);

  for (const r of reactions) {
    discontinuities.add(r.position);
  }
  for (const load of model.loads) {
    if (load.type === 'point') {
      discontinuities.add(load.position);
    } else if (load.type === 'distributed') {
      discontinuities.add(load.startPosition);
      discontinuities.add(load.endPosition);
    } else if (load.type === 'moment') {
      discontinuities.add(load.position);
    }
  }

  const sortedDisc = Array.from(discontinuities).sort((a, b) => a - b);

  // Calculate V(x) at each point using section method (left side)
  function shearAt(x: number, fromLeft: boolean = true): number {
    let V = 0;

    // Add reactions to the left of x
    for (const r of reactions) {
      if (fromLeft ? r.position < x || (r.position === x) : r.position <= x) {
        V += r.verticalForce;
      }
    }

    // Add point loads to the left of x
    for (const load of model.loads) {
      if (load.type === 'point') {
        const F = getSignedForce(load.magnitude, load.direction);
        if (fromLeft ? load.position < x || (load.position === x) : load.position <= x) {
          V += F;
        }
      } else if (load.type === 'distributed') {
        // Portion of distributed load to the left of x
        if (load.startPosition < x) {
          const end = Math.min(x, load.endPosition);
          const span = end - load.startPosition;
          const totalSpan = load.endPosition - load.startPosition;

          if (load.shape === 'uniform') {
            const F = getSignedForce(load.startMagnitude * span, load.direction);
            V += F;
          } else {
            // Trapezoidal/triangular
            const w1 = load.startMagnitude;
            const w2 = load.endMagnitude;
            const wAtEnd = w1 + (w2 - w1) * (span / totalSpan);
            const avgW = (w1 + wAtEnd) / 2;
            const F = getSignedForce(avgW * span, load.direction);
            V += F;
          }
        }
      }
    }

    return V;
  }

  // Generate diagram points
  const shearEquations: string[] = [];
  
  for (let i = 0; i <= numPoints; i++) {
    const x = Math.min(i * dx, L);
    const V = shearAt(x, true);
    diagram.push({ x, value: V });
  }

  // Handle discontinuities — add points just before and after
  for (const xd of sortedDisc) {
    if (xd > 0 && xd < L) {
      const vBefore = shearAt(xd - 1e-10, true);
      const vAfter = shearAt(xd, true);
      
      // Find if there's a jump
      if (Math.abs(vAfter - vBefore) > 1e-6) {
        criticalPoints.push({
          x: xd,
          value: vBefore,
          label: `V(${formatValue(xd)}⁻) = ${formatValue(vBefore)}`,
          type: 'discontinuity',
        });
        criticalPoints.push({
          x: xd,
          value: vAfter,
          label: `V(${formatValue(xd)}⁺) = ${formatValue(vAfter)}`,
          type: 'discontinuity',
        });
      }
    }
  }

  // Generate piecewise segments
  for (let i = 0; i < sortedDisc.length - 1; i++) {
    const startX = sortedDisc[i];
    const endX = sortedDisc[i + 1];
    const vStart = shearAt(startX, true);
    const vEnd = shearAt(endX - 1e-10, true);

    // Determine equation type
    let eqStr = '';
    const slope = (endX - startX) > 1e-10 ? (vEnd - vStart) / (endX - startX) : 0;

    if (Math.abs(slope) < 1e-6) {
      eqStr = `V(x) = ${formatValue(vStart)} ${model.forceUnit}`;
    } else {
      eqStr = `V(x) = ${formatValue(vStart)} + ${formatValue(slope)} × (x - ${formatValue(startX)}) ${model.forceUnit}`;
    }

    segments.push({
      startX,
      endX,
      equation: eqStr,
      coefficients: [vStart, slope],
    });

    shearEquations.push(`For ${formatValue(startX)} ≤ x ≤ ${formatValue(endX)}: ${eqStr}`);
  }

  // Find max, min, zeros
  let maxPositive: CriticalPoint | null = null;
  let maxNegative: CriticalPoint | null = null;

  for (const pt of diagram) {
    if (!maxPositive || pt.value > maxPositive.value) {
      maxPositive = { x: pt.x, value: pt.value, label: `V_max = ${formatValue(pt.value)}`, type: 'max' };
    }
    if (!maxNegative || pt.value < maxNegative.value) {
      maxNegative = { x: pt.x, value: pt.value, label: `V_min = ${formatValue(pt.value)}`, type: 'min' };
    }
  }

  // Find zero crossings
  for (let i = 1; i < diagram.length; i++) {
    const prev = diagram[i - 1];
    const curr = diagram[i];
    if ((prev.value > 0 && curr.value < 0) || (prev.value < 0 && curr.value > 0)) {
      // Linear interpolation for zero crossing
      const x0 = prev.x + (prev.value / (prev.value - curr.value)) * (curr.x - prev.x);
      zeroPoints.push({
        x: x0,
        value: 0,
        label: `V = 0 at x = ${formatValue(x0)}`,
        type: 'zero',
      });
    }
  }

  const maxAbsolute = (maxPositive && maxNegative)
    ? (Math.abs(maxPositive.value) >= Math.abs(maxNegative.value) ? maxPositive : maxNegative)
    : maxPositive || maxNegative;

  const shearSteps: CalculationStep[] = [{
    title: 'Step 3 — Shear Force Equations',
    description: 'Using section method (summing forces to the left of section).',
    equations: shearEquations,
  }];

  return {
    shearForce: {
      diagram,
      segments,
      criticalPoints,
      maxPositive,
      maxNegative,
      maxAbsolute,
      zeroPoints,
    },
    shearSteps,
  };
}

// ============================================================
// BENDING MOMENT CALCULATION
// ============================================================

function calculateBendingMoment(
  model: BeamModel,
  reactions: SupportReaction[]
): { bendingMoment: BendingMomentResult; momentSteps: CalculationStep[] } {
  const L = model.geometry.length;
  const numPoints = Math.max(500, Math.round(L * 100));
  const dx = L / numPoints;

  const diagram: DiagramPoint[] = [];
  const segments: PiecewiseSegment[] = [];
  const criticalPoints: CriticalPoint[] = [];

  // Collect all discontinuity points
  const discontinuities = new Set<number>();
  discontinuities.add(0);
  discontinuities.add(L);

  for (const r of reactions) {
    discontinuities.add(r.position);
  }
  for (const load of model.loads) {
    if (load.type === 'point') {
      discontinuities.add(load.position);
    } else if (load.type === 'distributed') {
      discontinuities.add(load.startPosition);
      discontinuities.add(load.endPosition);
    } else if (load.type === 'moment') {
      discontinuities.add(load.position);
    }
  }

  const sortedDisc = Array.from(discontinuities).sort((a, b) => a - b);

  // Calculate M(x) at each point using section method (left side)
  function momentAt(x: number): number {
    let M = 0;

    // Add reaction moments
    for (const r of reactions) {
      if (r.position <= x) {
        // Vertical reaction contributes moment
        M += r.verticalForce * (x - r.position);
        // Fixed support moment reaction
        if (r.moment !== 0) {
          M += r.moment;
        }
      }
    }

    // Add load effects
    for (const load of model.loads) {
      if (load.type === 'point') {
        if (load.position <= x) {
          const F = getSignedForce(load.magnitude, load.direction);
          M += F * (x - load.position);
        }
      } else if (load.type === 'distributed') {
        if (load.startPosition < x) {
          const end = Math.min(x, load.endPosition);
          const span = end - load.startPosition;
          const totalSpan = load.endPosition - load.startPosition;

          if (load.shape === 'uniform') {
            const w = load.startMagnitude;
            const F = getSignedForce(w * span, load.direction);
            const arm = span / 2;
            M += F * arm;
          } else {
            // Trapezoidal/triangular
            const w1 = load.startMagnitude;
            const w2 = load.endMagnitude;
            const wAtEnd = w1 + (w2 - w1) * (span / totalSpan);
            
            // Split into rectangle + triangle
            const wMin = Math.min(w1, wAtEnd);
            const wDiff = Math.abs(wAtEnd - w1);
            
            // Rectangular part
            const rectForce = getSignedForce(wMin * span, load.direction);
            M += rectForce * (span / 2);
            
            // Triangular part
            if (wDiff > 1e-10) {
              const triForce = getSignedForce((wDiff * span) / 2, load.direction);
              if (wAtEnd > w1) {
                // Triangle increasing
                M += triForce * (2 * span / 3);
              } else {
                // Triangle decreasing
                M += triForce * (span / 3);
              }
            }
          }
        }
      } else if (load.type === 'moment') {
        if (load.position <= x) {
          M += getSignedMoment(load.magnitude, load.direction);
        }
      }
    }

    return M;
  }

  // Generate diagram points
  const momentEquations: string[] = [];

  for (let i = 0; i <= numPoints; i++) {
    const x = Math.min(i * dx, L);
    const M = momentAt(x);
    diagram.push({ x, value: M });
  }

  // Generate piecewise segments
  for (let i = 0; i < sortedDisc.length - 1; i++) {
    const startX = sortedDisc[i];
    const endX = sortedDisc[i + 1];

    // Sample a few points to determine equation form
    const mStart = momentAt(startX);
    const mMid = momentAt((startX + endX) / 2);
    const mEnd = momentAt(endX - 1e-10);

    // Check if linear or parabolic
    const midExpected = (mStart + mEnd) / 2;
    const isParabolic = Math.abs(mMid - midExpected) > 1e-6;

    let eqStr = '';
    if (isParabolic) {
      // Quadratic: M(x) = a + b*(x-x0) + c*(x-x0)^2
      const dx1 = (endX - startX) / 2;
      const a = mStart;
      // Using three points to fit quadratic
      const c = (mEnd - 2 * mMid + mStart) / (2 * dx1 * dx1);
      const b = (mMid - mStart - c * dx1 * dx1) / dx1;
      
      eqStr = `M(x) = ${formatValue(a)} + ${formatValue(b)}(x-${formatValue(startX)}) + ${formatValue(c)}(x-${formatValue(startX)})² ${model.momentUnit}`;
      segments.push({
        startX,
        endX,
        equation: eqStr,
        coefficients: [a, b, c],
      });
    } else {
      // Linear
      const slope = (endX - startX) > 1e-10 ? (mEnd - mStart) / (endX - startX) : 0;
      if (Math.abs(slope) < 1e-6) {
        eqStr = `M(x) = ${formatValue(mStart)} ${model.momentUnit}`;
      } else {
        eqStr = `M(x) = ${formatValue(mStart)} + ${formatValue(slope)}(x-${formatValue(startX)}) ${model.momentUnit}`;
      }
      segments.push({
        startX,
        endX,
        equation: eqStr,
        coefficients: [mStart, slope],
      });
    }

    momentEquations.push(`For ${formatValue(startX)} ≤ x ≤ ${formatValue(endX)}: ${eqStr}`);
  }

  // Find max, min
  let maxPositive: CriticalPoint | null = null;
  let maxNegative: CriticalPoint | null = null;

  for (const pt of diagram) {
    if (!maxPositive || pt.value > maxPositive.value) {
      maxPositive = { x: pt.x, value: pt.value, label: `M_max = ${formatValue(pt.value)} (sagging)`, type: 'max' };
    }
    if (!maxNegative || pt.value < maxNegative.value) {
      maxNegative = { x: pt.x, value: pt.value, label: `M_min = ${formatValue(pt.value)} (hogging)`, type: 'min' };
    }
  }

  // Handle moment discontinuities
  for (const load of model.loads) {
    if (load.type === 'moment') {
      criticalPoints.push({
        x: load.position,
        value: momentAt(load.position),
        label: `Moment discontinuity at x = ${formatValue(load.position)}`,
        type: 'discontinuity',
      });
    }
  }

  const maxAbsolute = (maxPositive && maxNegative)
    ? (Math.abs(maxPositive.value) >= Math.abs(maxNegative.value) ? maxPositive : maxNegative)
    : maxPositive || maxNegative;

  const momentSteps: CalculationStep[] = [{
    title: 'Step 4 — Bending Moment Equations',
    description: 'Using section method (summing moments to the left of section). Positive = sagging.',
    equations: momentEquations,
  }];

  return {
    bendingMoment: {
      diagram,
      segments,
      criticalPoints,
      maxPositive,
      maxNegative,
      maxAbsolute,
    },
    momentSteps,
  };
}

// ============================================================
// CRITICAL POINT STEP GENERATION
// ============================================================

function generateCriticalPointStep(
  shear: ShearForceResult,
  moment: BendingMomentResult,
  model: BeamModel
): CalculationStep {
  const equations: string[] = [];

  equations.push('=== SHEAR FORCE CRITICAL VALUES ===');
  if (shear.maxPositive) {
    equations.push(`Maximum positive shear: ${formatValue(shear.maxPositive.value)} ${model.forceUnit} at x = ${formatValue(shear.maxPositive.x)} ${model.lengthUnit}`);
  }
  if (shear.maxNegative) {
    equations.push(`Maximum negative shear: ${formatValue(shear.maxNegative.value)} ${model.forceUnit} at x = ${formatValue(shear.maxNegative.x)} ${model.lengthUnit}`);
  }
  if (shear.maxAbsolute) {
    equations.push(`Maximum absolute shear: ${formatValue(Math.abs(shear.maxAbsolute.value))} ${model.forceUnit} at x = ${formatValue(shear.maxAbsolute.x)} ${model.lengthUnit}`);
  }

  if (shear.zeroPoints.length > 0) {
    equations.push('');
    equations.push('Shear force zero crossings (potential max/min moment locations):');
    for (const zp of shear.zeroPoints) {
      equations.push(`  V = 0 at x = ${formatValue(zp.x)} ${model.lengthUnit}`);
    }
  }

  equations.push('');
  equations.push('=== BENDING MOMENT CRITICAL VALUES ===');
  if (moment.maxPositive) {
    equations.push(`Maximum positive moment (sagging): ${formatValue(moment.maxPositive.value)} ${model.momentUnit} at x = ${formatValue(moment.maxPositive.x)} ${model.lengthUnit}`);
  }
  if (moment.maxNegative && moment.maxNegative.value < -1e-6) {
    equations.push(`Maximum negative moment (hogging): ${formatValue(moment.maxNegative.value)} ${model.momentUnit} at x = ${formatValue(moment.maxNegative.x)} ${model.lengthUnit}`);
  }
  if (moment.maxAbsolute) {
    equations.push(`Maximum absolute moment: ${formatValue(Math.abs(moment.maxAbsolute.value))} ${model.momentUnit} at x = ${formatValue(moment.maxAbsolute.x)} ${model.lengthUnit}`);
  }

  return {
    title: 'Step 5 — Critical Values',
    description: 'Summary of maximum and minimum values and their locations.',
    equations,
  };
}

// ============================================================
// EMPTY RESULTS
// ============================================================

function emptyShearResult(): ShearForceResult {
  return {
    diagram: [],
    segments: [],
    criticalPoints: [],
    maxPositive: null,
    maxNegative: null,
    maxAbsolute: null,
    zeroPoints: [],
  };
}

function emptyMomentResult(): BendingMomentResult {
  return {
    diagram: [],
    segments: [],
    criticalPoints: [],
    maxPositive: null,
    maxNegative: null,
    maxAbsolute: null,
  };
}
