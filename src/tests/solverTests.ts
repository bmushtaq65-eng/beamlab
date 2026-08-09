// ============================================================
// BEAMLAB — Solver Verification Tests
// Run with: npx tsx src/tests/solverTests.ts
// ============================================================

import { analyzeBeam } from '../solver/beamSolver';
import { BeamModel } from '../types/beam';
import { generateId } from '../utils/helpers';

function createModel(overrides: Partial<BeamModel> & { geometry: BeamModel['geometry']; supports: BeamModel['supports']; loads: BeamModel['loads'] }): BeamModel {
  return {
    id: generateId('test'),
    name: 'Test',
    unitSystem: 'SI',
    lengthUnit: 'm',
    forceUnit: 'kN',
    momentUnit: 'kN·m',
    distLoadUnit: 'kN/m',
    ...overrides,
  };
}

function assertClose(actual: number, expected: number, tolerance: number = 0.1, label: string = '') {
  if (Math.abs(actual - expected) > tolerance) {
    console.error(`  ✗ FAIL ${label}: expected ${expected}, got ${actual} (diff: ${Math.abs(actual - expected).toFixed(4)})`);
    return false;
  }
  console.log(`  ✓ PASS ${label}: ${actual.toFixed(2)} ≈ ${expected}`);
  return true;
}

let passed = 0;
let failed = 0;

function runTest(name: string, fn: () => boolean) {
  console.log(`\n── ${name} ──`);
  if (fn()) {
    passed++;
  } else {
    failed++;
  }
}

// ============================================================
// TEST CASE 1: Simply supported, center point load
// L=10m, P=20kN at center
// Expected: RA=10kN, RB=10kN, Mmax=50kN·m at center
// ============================================================
runTest('Case 1: SS Center Point Load', () => {
  const model = createModel({
    geometry: { length: 10 },
    supports: [
      { id: 's1', type: 'pin', position: 0 },
      { id: 's2', type: 'roller', position: 10 },
    ],
    loads: [
      { id: 'p1', type: 'point', magnitude: 20, position: 5, direction: 'down' },
    ],
  });

  const result = analyzeBeam(model);
  if (!result.success) { console.error('  Analysis failed:', result.error); return false; }

  const ra = result.reactions.find(r => r.position === 0);
  const rb = result.reactions.find(r => r.position === 10);

  let ok = true;
  ok = assertClose(ra!.verticalForce, 10, 0.1, 'RA') && ok;
  ok = assertClose(rb!.verticalForce, 10, 0.1, 'RB') && ok;
  ok = assertClose(result.bendingMoment.maxPositive?.value || 0, 50, 0.5, 'Mmax') && ok;
  ok = assertClose(result.bendingMoment.maxPositive?.x || 0, 5, 0.1, 'Mmax location') && ok;
  return ok;
});

// ============================================================
// TEST CASE 2: Simply supported, full UDL
// L=10m, w=5kN/m
// Expected: RA=25kN, RB=25kN, Mmax=62.5kN·m at center
// ============================================================
runTest('Case 2: SS Full UDL', () => {
  const model = createModel({
    geometry: { length: 10 },
    supports: [
      { id: 's1', type: 'pin', position: 0 },
      { id: 's2', type: 'roller', position: 10 },
    ],
    loads: [
      { id: 'u1', type: 'distributed', shape: 'uniform', startMagnitude: 5, endMagnitude: 5, startPosition: 0, endPosition: 10, direction: 'down' },
    ],
  });

  const result = analyzeBeam(model);
  if (!result.success) { console.error('  Analysis failed:', result.error); return false; }

  const ra = result.reactions.find(r => r.position === 0);
  const rb = result.reactions.find(r => r.position === 10);

  let ok = true;
  ok = assertClose(ra!.verticalForce, 25, 0.1, 'RA') && ok;
  ok = assertClose(rb!.verticalForce, 25, 0.1, 'RB') && ok;
  ok = assertClose(result.bendingMoment.maxPositive?.value || 0, 62.5, 0.5, 'Mmax') && ok;
  ok = assertClose(result.bendingMoment.maxPositive?.x || 0, 5, 0.1, 'Mmax location') && ok;
  return ok;
});

// ============================================================
// TEST CASE 3: Cantilever, end point load
// L=5m, P=10kN at end
// Expected: Ry=10kN, M=50kN·m (hogging)
// ============================================================
runTest('Case 3: Cantilever End Load', () => {
  const model = createModel({
    geometry: { length: 5 },
    supports: [
      { id: 's1', type: 'fixed', position: 0 },
    ],
    loads: [
      { id: 'p1', type: 'point', magnitude: 10, position: 5, direction: 'down' },
    ],
  });

  const result = analyzeBeam(model);
  if (!result.success) { console.error('  Analysis failed:', result.error); return false; }

  const r = result.reactions[0];
  let ok = true;
  ok = assertClose(r.verticalForce, 10, 0.1, 'Ry') && ok;
  ok = assertClose(Math.abs(r.moment), 50, 0.5, '|M_fixed|') && ok;
  return ok;
});

// ============================================================
// TEST CASE 4: Simply supported, two point loads
// L=8m, P1=20kN at 2m, P2=15kN at 6m
// ============================================================
runTest('Case 4: SS Two Point Loads', () => {
  const model = createModel({
    geometry: { length: 8 },
    supports: [
      { id: 's1', type: 'pin', position: 0 },
      { id: 's2', type: 'roller', position: 8 },
    ],
    loads: [
      { id: 'p1', type: 'point', magnitude: 20, position: 2, direction: 'down' },
      { id: 'p2', type: 'point', magnitude: 15, position: 6, direction: 'down' },
    ],
  });

  const result = analyzeBeam(model);
  if (!result.success) { console.error('  Analysis failed:', result.error); return false; }

  // ΣM_A = 0: RB*8 - 20*2 - 15*6 = 0 → RB = (40+90)/8 = 16.25
  // ΣFy = 0: RA + RB = 35 → RA = 18.75
  const ra = result.reactions.find(r => r.position === 0);
  const rb = result.reactions.find(r => r.position === 8);

  let ok = true;
  ok = assertClose(ra!.verticalForce, 18.75, 0.1, 'RA') && ok;
  ok = assertClose(rb!.verticalForce, 16.25, 0.1, 'RB') && ok;
  return ok;
});

// ============================================================
// TEST CASE 5: Cantilever, full UDL
// L=5m, w=4kN/m
// Expected: Ry=20kN, M=50kN·m (hogging at fixed end)
// ============================================================
runTest('Case 5: Cantilever Full UDL', () => {
  const model = createModel({
    geometry: { length: 5 },
    supports: [
      { id: 's1', type: 'fixed', position: 0 },
    ],
    loads: [
      { id: 'u1', type: 'distributed', shape: 'uniform', startMagnitude: 4, endMagnitude: 4, startPosition: 0, endPosition: 5, direction: 'down' },
    ],
  });

  const result = analyzeBeam(model);
  if (!result.success) { console.error('  Analysis failed:', result.error); return false; }

  const r = result.reactions[0];
  let ok = true;
  ok = assertClose(r.verticalForce, 20, 0.1, 'Ry') && ok;
  ok = assertClose(Math.abs(r.moment), 50, 0.5, '|M_fixed|') && ok;
  return ok;
});

// ============================================================
// TEST CASE 6: Simply supported with applied moment
// L=8m, M=10kN·m CW at 4m
// Expected: ΣM_A = 0: RB*8 + (-10) = 0 → RB = 1.25
//           RA + RB = 0 → RA = -1.25
// ============================================================
runTest('Case 6: SS Applied Moment', () => {
  const model = createModel({
    geometry: { length: 8 },
    supports: [
      { id: 's1', type: 'pin', position: 0 },
      { id: 's2', type: 'roller', position: 8 },
    ],
    loads: [
      { id: 'm1', type: 'moment', magnitude: 10, position: 4, direction: 'clockwise' },
    ],
  });

  const result = analyzeBeam(model);
  if (!result.success) { console.error('  Analysis failed:', result.error); return false; }

  const ra = result.reactions.find(r => r.position === 0);
  const rb = result.reactions.find(r => r.position === 8);

  // CW moment = -10 in our convention (CCW positive)
  // ΣM_A = 0: RB*8 + (-10) = 0 → RB = 10/8 = 1.25
  // ΣFy = 0: RA + RB = 0 → RA = -1.25

  let ok = true;
  ok = assertClose(ra!.verticalForce, -1.25, 0.1, 'RA') && ok;
  ok = assertClose(rb!.verticalForce, 1.25, 0.1, 'RB') && ok;
  return ok;
});

// ============================================================
// TEST CASE 7: Mixed loading (from spec)
// L=8m, P1=20kN@2m, P2=15kN@6m, UDL=5kN/m 0-8m, M=10kN·m CW@4m
// ============================================================
runTest('Case 7: Mixed Loading', () => {
  const model = createModel({
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
  });

  const result = analyzeBeam(model);
  if (!result.success) { console.error('  Analysis failed:', result.error); return false; }

  // Total vertical loads: 20 + 15 + 5*8 = 75 kN downward
  // ΣM_A = 0: RB*8 - 20*2 - 15*6 - 40*4 + (-10) = 0
  //   RB*8 = 40 + 90 + 160 + 10 = 300 ... wait
  //   RB*8 = 40 + 90 + 160 - 10 = 280  → RB = 35
  //   RA = 75 - 35 = 40

  // Let me recalculate:
  // Moments about A (all loads are downward = negative force in our convention):
  // Point load at 2m: F=-20, moment = -20 * 2 = -40
  // Point load at 6m: F=-15, moment = -15 * 6 = -90
  // UDL resultant: F=-40 at 4m, moment = -40 * 4 = -160
  // Applied moment CW = -10 (CW is negative in our convention)
  //
  // ΣM_A = 0: RB * 8 + (-40) + (-90) + (-160) + (-10) = 0
  // RB * 8 = 300
  // RB = 37.5

  // Wait, let me be more careful with my solver's sign logic:
  // In the solver, momentAboutA = sum of F*arm for loads
  // F = getSignedForce(mag, dir) where down returns -magnitude
  // So for 20kN down: F = -20, arm = 2, contribution to momentAboutA = -20 * 2 = -40
  // For UDL: resultant = 40, F = -40, arm = 4, contribution = -40 * 4 = -160
  // For moment CW: M = -10, contribution = -10
  // totalMomentAboutA = -40 + -90 + -160 + -10 = -300
  // RB = -momentAboutA / span = -(-300) / 8 = 37.5
  // totalVerticalLoad = -20 + -15 + -40 = -75
  // RA = -(totalVerticalLoad + RB) = -(-75 + 37.5) = 37.5

  const ra = result.reactions.find(r => r.position === 0);
  const rb = result.reactions.find(r => r.position === 8);

  let ok = true;
  ok = assertClose(ra!.verticalForce, 37.5, 0.1, 'RA') && ok;
  ok = assertClose(rb!.verticalForce, 37.5, 0.1, 'RB') && ok;
  
  // Verify equilibrium: RA + RB should equal total load
  const totalLoad = 20 + 15 + 40; // 75 kN
  ok = assertClose(ra!.verticalForce + rb!.verticalForce, totalLoad, 0.1, 'ΣFy check') && ok;
  
  return ok;
});

// ============================================================
// SUMMARY
// ============================================================
console.log(`\n${'═'.repeat(40)}`);
console.log(`RESULTS: ${passed} passed, ${failed} failed out of ${passed + failed} tests`);
console.log(`${'═'.repeat(40)}`);

if (failed > 0) {
  throw new Error("Tests failed");
}
