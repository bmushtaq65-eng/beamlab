// ============================================================
// BEAMLAB — Results Display Components
// Reactions, Critical Values, Step-by-Step Calculations
// ============================================================

import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { formatValue } from '../utils/units';
import { AnalysisResult, CalculationStep, SupportReaction } from '../types/beam';

// ============================================================
// REACTIONS CARD
// ============================================================

export function ReactionsCard() {
  const { state } = useAppContext();
  const { analysisResult, beamModel } = state;

  if (!analysisResult || !analysisResult.success) return null;

  return (
    <div className="result-card">
      <h3 className="result-card-title">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="12" y1="22" x2="12" y2="6"/>
          <polyline points="8,10 12,6 16,10"/>
        </svg>
        Support Reactions
      </h3>
      <div className="reactions-grid">
        {analysisResult.reactions.map((reaction, i) => (
          <ReactionItem key={reaction.supportId} reaction={reaction} index={i} />
        ))}
      </div>
    </div>
  );
}

function ReactionItem({ reaction, index }: { reaction: SupportReaction; index: number }) {
  const { state } = useAppContext();
  const { beamModel } = state;
  const support = beamModel.supports.find(s => s.id === reaction.supportId);
  const label = support ? `${support.type.charAt(0).toUpperCase() + support.type.slice(1)} at ${formatValue(reaction.position)} ${beamModel.lengthUnit}` : `Support ${index + 1}`;

  return (
    <div className="reaction-item">
      <div className="reaction-label">{label}</div>
      <div className="reaction-values">
        <div className="reaction-value">
          <span className="reaction-symbol">R<sub>y</sub></span>
          <span className={`reaction-number ${reaction.verticalForce >= 0 ? 'value-positive' : 'value-negative'}`}>
            {formatValue(reaction.verticalForce)} {beamModel.forceUnit}
          </span>
          <span className="reaction-direction">{reaction.verticalForce >= 0 ? '↑' : '↓'}</span>
        </div>
        {Math.abs(reaction.horizontalForce) > 1e-10 && (
          <div className="reaction-value">
            <span className="reaction-symbol">R<sub>x</sub></span>
            <span className={`reaction-number ${reaction.horizontalForce >= 0 ? 'value-positive' : 'value-negative'}`}>
              {formatValue(reaction.horizontalForce)} {beamModel.forceUnit}
            </span>
            <span className="reaction-direction">{reaction.horizontalForce >= 0 ? '→' : '←'}</span>
          </div>
        )}
        {Math.abs(reaction.moment) > 1e-10 && (
          <div className="reaction-value">
            <span className="reaction-symbol">M</span>
            <span className={`reaction-number ${reaction.moment >= 0 ? 'value-positive' : 'value-negative'}`}>
              {formatValue(reaction.moment)} {beamModel.momentUnit}
            </span>
            <span className="reaction-direction">{reaction.moment >= 0 ? '↺' : '↻'}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// CRITICAL VALUES CARD
// ============================================================

export function CriticalValuesCard() {
  const { state } = useAppContext();
  const { analysisResult, beamModel } = state;

  if (!analysisResult || !analysisResult.success) return null;

  const { shearForce, bendingMoment } = analysisResult;

  return (
    <div className="result-card result-card-highlight">
      <h3 className="result-card-title">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14l-5-4.87 6.91-1.01L12 2z"/>
        </svg>
        Critical Results
      </h3>
      <div className="critical-grid">
        {/* Shear */}
        <div className="critical-section">
          <h4 className="critical-section-title">Shear Force</h4>
          {shearForce.maxAbsolute && (
            <div className="critical-item critical-item-primary">
              <span className="critical-label">Max |V|</span>
              <span className="critical-value">{formatValue(Math.abs(shearForce.maxAbsolute.value))} {beamModel.forceUnit}</span>
              <span className="critical-location">at x = {formatValue(shearForce.maxAbsolute.x)} {beamModel.lengthUnit}</span>
            </div>
          )}
          {shearForce.maxPositive && shearForce.maxPositive.value > 1e-6 && (
            <div className="critical-item">
              <span className="critical-label">V<sub>max</sub> (+)</span>
              <span className="critical-value value-positive">{formatValue(shearForce.maxPositive.value)} {beamModel.forceUnit}</span>
              <span className="critical-location">at x = {formatValue(shearForce.maxPositive.x)} {beamModel.lengthUnit}</span>
            </div>
          )}
          {shearForce.maxNegative && shearForce.maxNegative.value < -1e-6 && (
            <div className="critical-item">
              <span className="critical-label">V<sub>min</sub> (−)</span>
              <span className="critical-value value-negative">{formatValue(shearForce.maxNegative.value)} {beamModel.forceUnit}</span>
              <span className="critical-location">at x = {formatValue(shearForce.maxNegative.x)} {beamModel.lengthUnit}</span>
            </div>
          )}
          {shearForce.zeroPoints.length > 0 && (
            <div className="critical-item">
              <span className="critical-label">V = 0</span>
              <span className="critical-value">
                {shearForce.zeroPoints.map(zp => `x = ${formatValue(zp.x)} ${beamModel.lengthUnit}`).join(', ')}
              </span>
            </div>
          )}
        </div>

        {/* Bending Moment */}
        <div className="critical-section">
          <h4 className="critical-section-title">Bending Moment</h4>
          {bendingMoment.maxAbsolute && (
            <div className="critical-item critical-item-primary">
              <span className="critical-label">Max |M|</span>
              <span className="critical-value">{formatValue(Math.abs(bendingMoment.maxAbsolute.value))} {beamModel.momentUnit}</span>
              <span className="critical-location">at x = {formatValue(bendingMoment.maxAbsolute.x)} {beamModel.lengthUnit}</span>
            </div>
          )}
          {bendingMoment.maxPositive && bendingMoment.maxPositive.value > 1e-6 && (
            <div className="critical-item">
              <span className="critical-label">M<sub>max</sub> (sagging)</span>
              <span className="critical-value value-positive">{formatValue(bendingMoment.maxPositive.value)} {beamModel.momentUnit}</span>
              <span className="critical-location">at x = {formatValue(bendingMoment.maxPositive.x)} {beamModel.lengthUnit}</span>
            </div>
          )}
          {bendingMoment.maxNegative && bendingMoment.maxNegative.value < -1e-6 && (
            <div className="critical-item">
              <span className="critical-label">M<sub>min</sub> (hogging)</span>
              <span className="critical-value value-negative">{formatValue(bendingMoment.maxNegative.value)} {beamModel.momentUnit}</span>
              <span className="critical-location">at x = {formatValue(bendingMoment.maxNegative.x)} {beamModel.lengthUnit}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// LOAD TABLE
// ============================================================

export function LoadTable() {
  const { state } = useAppContext();
  const { beamModel } = state;

  if (beamModel.loads.length === 0) return null;

  return (
    <div className="result-card">
      <h3 className="result-card-title">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 3h18v18H3z"/>
          <path d="M3 9h18M3 15h18M9 3v18"/>
        </svg>
        Load Summary
      </h3>
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Type</th>
              <th>Magnitude</th>
              <th>Position</th>
              <th>Direction</th>
            </tr>
          </thead>
          <tbody>
            {beamModel.loads.map((load, i) => {
              if (load.type === 'point') {
                return (
                  <tr key={load.id}>
                    <td className="mono">P{i + 1}</td>
                    <td>Point</td>
                    <td className="mono">{formatValue(load.magnitude)} {beamModel.forceUnit}</td>
                    <td className="mono">{formatValue(load.position)} {beamModel.lengthUnit}</td>
                    <td>{load.direction === 'down' ? '↓ Down' : '↑ Up'}</td>
                  </tr>
                );
              } else if (load.type === 'distributed') {
                return (
                  <tr key={load.id}>
                    <td className="mono">D{i + 1}</td>
                    <td>{load.shape === 'uniform' ? 'UDL' : load.shape}</td>
                    <td className="mono">
                      {load.shape === 'uniform' 
                        ? `${formatValue(load.startMagnitude)} ${beamModel.distLoadUnit}`
                        : `${formatValue(load.startMagnitude)}→${formatValue(load.endMagnitude)} ${beamModel.distLoadUnit}`
                      }
                    </td>
                    <td className="mono">{formatValue(load.startPosition)}–{formatValue(load.endPosition)} {beamModel.lengthUnit}</td>
                    <td>{load.direction === 'down' ? '↓ Down' : '↑ Up'}</td>
                  </tr>
                );
              } else {
                return (
                  <tr key={load.id}>
                    <td className="mono">M{i + 1}</td>
                    <td>Moment</td>
                    <td className="mono">{formatValue(load.magnitude)} {beamModel.momentUnit}</td>
                    <td className="mono">{formatValue(load.position)} {beamModel.lengthUnit}</td>
                    <td>{load.direction === 'clockwise' ? '↻ CW' : '↺ CCW'}</td>
                  </tr>
                );
              }
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================
// STEP-BY-STEP CALCULATIONS
// ============================================================

export function CalculationsPanel() {
  const { state } = useAppContext();
  const { analysisResult, beamModel } = state;

  if (!analysisResult || !analysisResult.success) return null;

  return (
    <div className="result-card calculations-card">
      <h3 className="result-card-title">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="4" y="2" width="16" height="20" rx="2"/>
          <line x1="8" y1="6" x2="16" y2="6"/>
          <line x1="8" y1="10" x2="16" y2="10"/>
          <line x1="8" y1="14" x2="12" y2="14"/>
        </svg>
        Step-by-Step Calculations
      </h3>

      <div className="sign-convention-box">
        <h4>Sign Convention</h4>
        <pre>{analysisResult.signConvention}</pre>
      </div>

      {analysisResult.calculationSteps.map((step, i) => (
        <CalculationStepView key={i} step={step} />
      ))}
    </div>
  );
}

function CalculationStepView({ step }: { step: CalculationStep }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="calc-step">
      <button className="calc-step-header" onClick={() => setExpanded(!expanded)}>
        <span className="calc-step-title">{step.title}</span>
        <span className={`calc-step-chevron ${expanded ? 'expanded' : ''}`}>▾</span>
      </button>
      {expanded && (
        <div className="calc-step-body">
          {step.description && (
            <p className="calc-step-desc">{step.description}</p>
          )}
          <div className="calc-equations">
            {step.equations.map((eq, i) => (
              <div key={i} className={`calc-equation ${eq === '' ? 'calc-spacer' : ''} ${eq.startsWith('===') ? 'calc-section-divider' : ''}`}>
                {eq.startsWith('===') ? (
                  <strong>{eq.replace(/===/g, '').trim()}</strong>
                ) : (
                  <code>{eq}</code>
                )}
              </div>
            ))}
          </div>
          {step.result && (
            <div className="calc-result">
              <strong>{step.result}</strong>
            </div>
          )}
          {step.substeps && step.substeps.map((sub, i) => (
            <CalculationStepView key={i} step={sub} />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// ERROR DISPLAY
// ============================================================

export function AnalysisError() {
  const { state } = useAppContext();
  const { analysisResult } = state;

  if (!analysisResult || analysisResult.success) return null;

  return (
    <div className="alert alert-error">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <div>
        <strong>Analysis Error</strong>
        <p>{analysisResult.error}</p>
      </div>
    </div>
  );
}

// ============================================================
// COORDINATE INSPECTOR
// ============================================================

export function CoordinateInspector() {
  const { state } = useAppContext();
  const { analysisResult, beamModel } = state;
  const [x, setX] = useState<number>(0);

  if (!analysisResult || !analysisResult.success) return null;

  // Find V(x) and M(x) from diagram data by interpolation
  const findValue = (diagram: { x: number; value: number }[], xVal: number): number => {
    if (diagram.length === 0) return 0;
    if (xVal <= diagram[0].x) return diagram[0].value;
    if (xVal >= diagram[diagram.length - 1].x) return diagram[diagram.length - 1].value;
    
    for (let i = 1; i < diagram.length; i++) {
      if (diagram[i].x >= xVal) {
        const t = (xVal - diagram[i - 1].x) / (diagram[i].x - diagram[i - 1].x);
        return diagram[i - 1].value + t * (diagram[i].value - diagram[i - 1].value);
      }
    }
    return 0;
  };

  const V = findValue(analysisResult.shearForce.diagram, x);
  const M = findValue(analysisResult.bendingMoment.diagram, x);

  return (
    <div className="result-card inspector-card">
      <h3 className="result-card-title">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8"/>
          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        Coordinate Inspector
      </h3>
      <div className="inspector-input">
        <label>x =</label>
        <input
          type="range"
          min={0}
          max={beamModel.geometry.length}
          step={0.01}
          value={x}
          onChange={e => setX(parseFloat(e.target.value))}
          className="inspector-slider"
        />
        <span className="mono">{formatValue(x, 2)} {beamModel.lengthUnit}</span>
      </div>
      <div className="inspector-results">
        <div className="inspector-result">
          <span className="inspector-label">V(x)</span>
          <span className={`inspector-value mono ${V >= 0 ? 'value-positive' : 'value-negative'}`}>
            {formatValue(V, 3)} {beamModel.forceUnit}
          </span>
        </div>
        <div className="inspector-result">
          <span className="inspector-label">M(x)</span>
          <span className={`inspector-value mono ${M >= 0 ? 'value-positive' : 'value-negative'}`}>
            {formatValue(M, 3)} {beamModel.momentUnit}
          </span>
        </div>
      </div>
    </div>
  );
}
