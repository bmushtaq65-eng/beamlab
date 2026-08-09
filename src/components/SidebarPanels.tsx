// ============================================================
// BEAMLAB — Sidebar Panel Components
// Beam, Supports, Loads, Units input panels
// ============================================================

import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { 
  Support, Load, PointLoad, DistributedLoad, AppliedMoment,
  SupportType, LoadDirection, MomentDirection, DistLoadShape,
  LengthUnit, ForceUnit, MomentUnit, DistLoadUnit, UnitSystem,
} from '../types/beam';
import { generateId } from '../utils/helpers';
import { formatValue } from '../utils/units';
import { getPresetsByCategory } from '../solver/presets';
import { BeamPreset } from '../types/beam';

// ============================================================
// BEAM PANEL
// ============================================================

export function BeamPanel() {
  const { state, dispatch } = useAppContext();
  const { beamModel } = state;

  return (
    <div className="panel-section">
      <h3 className="panel-title">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="1" y="10" width="22" height="4" rx="1"/>
        </svg>
        Beam Geometry
      </h3>
      <div className="form-group">
        <label className="form-label">
          Length ({beamModel.lengthUnit})
        </label>
        <input
          type="number"
          className="form-input"
          value={beamModel.geometry.length}
          min={0.1}
          step={0.1}
          onChange={e => {
            const val = parseFloat(e.target.value);
            if (val > 0) dispatch({ type: 'SET_BEAM_LENGTH', payload: val });
          }}
        />
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Width ({beamModel.lengthUnit})</label>
          <input
            type="number"
            className="form-input"
            value={beamModel.geometry.width || ''}
            placeholder="Optional"
            min={0}
            step={0.01}
            onChange={e => {
              const val = parseFloat(e.target.value);
              dispatch({ type: 'SET_BEAM_GEOMETRY', payload: { width: val || undefined } });
            }}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Depth ({beamModel.lengthUnit})</label>
          <input
            type="number"
            className="form-input"
            value={beamModel.geometry.depth || ''}
            placeholder="Optional"
            min={0}
            step={0.01}
            onChange={e => {
              const val = parseFloat(e.target.value);
              dispatch({ type: 'SET_BEAM_GEOMETRY', payload: { depth: val || undefined } });
            }}
          />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Material</label>
        <select
          className="form-select"
          value={beamModel.geometry.material || ''}
          onChange={e => dispatch({ type: 'SET_BEAM_GEOMETRY', payload: { material: e.target.value || undefined } })}
        >
          <option value="">Not specified</option>
          <option value="Steel">Steel</option>
          <option value="Concrete">Concrete</option>
          <option value="Timber">Timber</option>
          <option value="Aluminum">Aluminum</option>
        </select>
      </div>
    </div>
  );
}

// ============================================================
// SUPPORTS PANEL
// ============================================================

export function SupportsPanel() {
  const { state, dispatch } = useAppContext();
  const { beamModel } = state;

  const addSupport = (type: SupportType) => {
    // Find a position that doesn't overlap
    const existing = beamModel.supports.map(s => s.position);
    let pos = beamModel.geometry.length / 2;
    while (existing.includes(pos)) {
      pos += 0.5;
    }
    pos = Math.min(pos, beamModel.geometry.length);

    dispatch({
      type: 'ADD_SUPPORT',
      payload: { id: generateId('sup'), type, position: pos },
    });
  };

  return (
    <div className="panel-section">
      <h3 className="panel-title">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="12,4 4,20 20,20"/>
        </svg>
        Supports
      </h3>
      
      <div className="support-list">
        {beamModel.supports.map((support) => (
          <SupportItem key={support.id} support={support} />
        ))}
      </div>

      <div className="btn-group">
        <button className="btn btn-sm btn-outline" onClick={() => addSupport('pin')} title="Add Pin Support">
          <span className="support-icon">△</span> Pin
        </button>
        <button className="btn btn-sm btn-outline" onClick={() => addSupport('roller')} title="Add Roller Support">
          <span className="support-icon">○</span> Roller
        </button>
        <button className="btn btn-sm btn-outline" onClick={() => addSupport('fixed')} title="Add Fixed Support">
          <span className="support-icon">▌</span> Fixed
        </button>
      </div>
    </div>
  );
}

function SupportItem({ support }: { support: Support }) {
  const { state, dispatch } = useAppContext();
  const isSelected = state.selectedSupportId === support.id;

  const typeLabels: Record<SupportType, string> = {
    pin: '△ Pin',
    roller: '○ Roller',
    fixed: '▌ Fixed',
  };

  return (
    <div 
      className={`list-item ${isSelected ? 'list-item-selected' : ''}`}
      onClick={() => dispatch({ type: 'SELECT_SUPPORT', payload: support.id })}
    >
      <div className="list-item-header">
        <span className="list-item-type">{typeLabels[support.type]}</span>
        <button
          className="btn btn-icon btn-ghost btn-danger-hover"
          onClick={e => { e.stopPropagation(); dispatch({ type: 'REMOVE_SUPPORT', payload: support.id }); }}
          title="Remove"
        >
          ×
        </button>
      </div>
      <div className="list-item-fields">
        <div className="form-group-inline">
          <label>Type</label>
          <select
            className="form-select form-select-sm"
            value={support.type}
            onChange={e => dispatch({ type: 'UPDATE_SUPPORT', payload: { ...support, type: e.target.value as SupportType } })}
            onClick={e => e.stopPropagation()}
          >
            <option value="pin">Pin</option>
            <option value="roller">Roller</option>
            <option value="fixed">Fixed</option>
          </select>
        </div>
        <div className="form-group-inline">
          <label>Position ({state.beamModel.lengthUnit})</label>
          <input
            type="number"
            className="form-input form-input-sm"
            value={support.position}
            min={0}
            max={state.beamModel.geometry.length}
            step={0.1}
            onChange={e => dispatch({ type: 'UPDATE_SUPPORT', payload: { ...support, position: parseFloat(e.target.value) || 0 } })}
            onClick={e => e.stopPropagation()}
          />
        </div>
      </div>
    </div>
  );
}

// ============================================================
// LOADS PANEL
// ============================================================

export function LoadsPanel() {
  const { state, dispatch } = useAppContext();
  const { beamModel } = state;
  const [addType, setAddType] = useState<'point' | 'distributed' | 'moment'>('point');

  const addLoad = () => {
    const L = beamModel.geometry.length;
    let load: Load;
    
    switch (addType) {
      case 'point':
        load = {
          id: generateId('load'),
          type: 'point',
          magnitude: 10,
          position: L / 2,
          direction: 'down' as LoadDirection,
        };
        break;
      case 'distributed':
        load = {
          id: generateId('load'),
          type: 'distributed',
          shape: 'uniform' as DistLoadShape,
          startMagnitude: 5,
          endMagnitude: 5,
          startPosition: 0,
          endPosition: L,
          direction: 'down' as LoadDirection,
        };
        break;
      case 'moment':
        load = {
          id: generateId('load'),
          type: 'moment',
          magnitude: 10,
          position: L / 2,
          direction: 'clockwise' as MomentDirection,
        };
        break;
    }
    dispatch({ type: 'ADD_LOAD', payload: load });
  };

  return (
    <div className="panel-section">
      <h3 className="panel-title">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="12" y1="2" x2="12" y2="18"/>
          <polyline points="8,14 12,18 16,14"/>
        </svg>
        Loads ({beamModel.loads.length})
      </h3>

      <div className="load-list">
        {beamModel.loads.map(load => (
          <LoadItem key={load.id} load={load} />
        ))}
        {beamModel.loads.length === 0 && (
          <div className="empty-state">
            No loads applied. Add a load below.
          </div>
        )}
      </div>

      <div className="add-load-bar">
        <select
          className="form-select form-select-sm"
          value={addType}
          onChange={e => setAddType(e.target.value as typeof addType)}
        >
          <option value="point">Point Load</option>
          <option value="distributed">Distributed Load</option>
          <option value="moment">Applied Moment</option>
        </select>
        <button className="btn btn-sm btn-primary" onClick={addLoad}>
          + Add Load
        </button>
      </div>
    </div>
  );
}

function LoadItem({ load }: { load: Load }) {
  const { state, dispatch } = useAppContext();
  const isSelected = state.selectedLoadId === load.id;
  const { beamModel } = state;

  const getLoadLabel = () => {
    if (load.type === 'point') return `↓ ${load.magnitude} ${beamModel.forceUnit} at ${load.position} ${beamModel.lengthUnit}`;
    if (load.type === 'distributed') return `⟶ ${load.startMagnitude} ${beamModel.distLoadUnit} (${load.startPosition}-${load.endPosition} ${beamModel.lengthUnit})`;
    if (load.type === 'moment') return `↻ ${load.magnitude} ${beamModel.momentUnit} at ${load.position} ${beamModel.lengthUnit}`;
    return '';
  };

  const typeIcons: Record<string, string> = {
    point: '↓',
    distributed: '⟶',
    moment: '↻',
  };

  return (
    <div 
      className={`list-item ${isSelected ? 'list-item-selected' : ''}`}
      onClick={() => dispatch({ type: 'SELECT_LOAD', payload: load.id })}
    >
      <div className="list-item-header">
        <span className="list-item-type">
          {typeIcons[load.type]} {load.type === 'point' ? 'Point Load' : load.type === 'distributed' ? 'Distributed' : 'Moment'}
        </span>
        <div className="list-item-actions">
          <button
            className="btn btn-icon btn-ghost"
            onClick={e => { e.stopPropagation(); dispatch({ type: 'DUPLICATE_LOAD', payload: load.id }); }}
            title="Duplicate"
          >
            ⧉
          </button>
          <button
            className="btn btn-icon btn-ghost btn-danger-hover"
            onClick={e => { e.stopPropagation(); dispatch({ type: 'REMOVE_LOAD', payload: load.id }); }}
            title="Delete"
          >
            ×
          </button>
        </div>
      </div>

      {load.type === 'point' && <PointLoadFields load={load} />}
      {load.type === 'distributed' && <DistributedLoadFields load={load} />}
      {load.type === 'moment' && <MomentLoadFields load={load} />}
    </div>
  );
}

function PointLoadFields({ load }: { load: PointLoad }) {
  const { state, dispatch } = useAppContext();
  const { beamModel } = state;

  const update = (changes: Partial<PointLoad>) => {
    dispatch({ type: 'UPDATE_LOAD', payload: { ...load, ...changes } });
  };

  return (
    <div className="list-item-fields" onClick={e => e.stopPropagation()}>
      <div className="form-group-inline">
        <label>Magnitude ({beamModel.forceUnit})</label>
        <input
          type="number"
          className="form-input form-input-sm"
          value={load.magnitude}
          min={0}
          step={1}
          onChange={e => update({ magnitude: parseFloat(e.target.value) || 0 })}
        />
      </div>
      <div className="form-group-inline">
        <label>Position ({beamModel.lengthUnit})</label>
        <input
          type="number"
          className="form-input form-input-sm"
          value={load.position}
          min={0}
          max={beamModel.geometry.length}
          step={0.1}
          onChange={e => update({ position: parseFloat(e.target.value) || 0 })}
        />
      </div>
      <div className="form-group-inline">
        <label>Direction</label>
        <select
          className="form-select form-select-sm"
          value={load.direction}
          onChange={e => update({ direction: e.target.value as LoadDirection })}
        >
          <option value="down">↓ Down</option>
          <option value="up">↑ Up</option>
        </select>
      </div>
    </div>
  );
}

function DistributedLoadFields({ load }: { load: DistributedLoad }) {
  const { state, dispatch } = useAppContext();
  const { beamModel } = state;

  const update = (changes: Partial<DistributedLoad>) => {
    const updated = { ...load, ...changes };
    if (changes.shape === 'uniform') {
      updated.endMagnitude = updated.startMagnitude;
    }
    dispatch({ type: 'UPDATE_LOAD', payload: updated });
  };

  return (
    <div className="list-item-fields" onClick={e => e.stopPropagation()}>
      <div className="form-group-inline">
        <label>Shape</label>
        <select
          className="form-select form-select-sm"
          value={load.shape}
          onChange={e => update({ shape: e.target.value as DistLoadShape })}
        >
          <option value="uniform">Uniform</option>
          <option value="triangular">Triangular</option>
          <option value="trapezoidal">Trapezoidal</option>
        </select>
      </div>
      <div className="form-group-inline">
        <label>Start intensity ({beamModel.distLoadUnit})</label>
        <input
          type="number"
          className="form-input form-input-sm"
          value={load.startMagnitude}
          min={0}
          step={0.5}
          onChange={e => {
            const val = parseFloat(e.target.value) || 0;
            update({ startMagnitude: val, ...(load.shape === 'uniform' ? { endMagnitude: val } : {}) });
          }}
        />
      </div>
      {load.shape !== 'uniform' && (
        <div className="form-group-inline">
          <label>End intensity ({beamModel.distLoadUnit})</label>
          <input
            type="number"
            className="form-input form-input-sm"
            value={load.endMagnitude}
            min={0}
            step={0.5}
            onChange={e => update({ endMagnitude: parseFloat(e.target.value) || 0 })}
          />
        </div>
      )}
      <div className="form-row">
        <div className="form-group-inline">
          <label>Start ({beamModel.lengthUnit})</label>
          <input
            type="number"
            className="form-input form-input-sm"
            value={load.startPosition}
            min={0}
            max={beamModel.geometry.length}
            step={0.1}
            onChange={e => update({ startPosition: parseFloat(e.target.value) || 0 })}
          />
        </div>
        <div className="form-group-inline">
          <label>End ({beamModel.lengthUnit})</label>
          <input
            type="number"
            className="form-input form-input-sm"
            value={load.endPosition}
            min={0}
            max={beamModel.geometry.length}
            step={0.1}
            onChange={e => update({ endPosition: parseFloat(e.target.value) || 0 })}
          />
        </div>
      </div>
      <div className="form-group-inline">
        <label>Direction</label>
        <select
          className="form-select form-select-sm"
          value={load.direction}
          onChange={e => update({ direction: e.target.value as LoadDirection })}
        >
          <option value="down">↓ Down</option>
          <option value="up">↑ Up</option>
        </select>
      </div>
    </div>
  );
}

function MomentLoadFields({ load }: { load: AppliedMoment }) {
  const { state, dispatch } = useAppContext();
  const { beamModel } = state;

  const update = (changes: Partial<AppliedMoment>) => {
    dispatch({ type: 'UPDATE_LOAD', payload: { ...load, ...changes } });
  };

  return (
    <div className="list-item-fields" onClick={e => e.stopPropagation()}>
      <div className="form-group-inline">
        <label>Magnitude ({beamModel.momentUnit})</label>
        <input
          type="number"
          className="form-input form-input-sm"
          value={load.magnitude}
          min={0}
          step={1}
          onChange={e => update({ magnitude: parseFloat(e.target.value) || 0 })}
        />
      </div>
      <div className="form-group-inline">
        <label>Position ({beamModel.lengthUnit})</label>
        <input
          type="number"
          className="form-input form-input-sm"
          value={load.position}
          min={0}
          max={beamModel.geometry.length}
          step={0.1}
          onChange={e => update({ position: parseFloat(e.target.value) || 0 })}
        />
      </div>
      <div className="form-group-inline">
        <label>Direction</label>
        <select
          className="form-select form-select-sm"
          value={load.direction}
          onChange={e => update({ direction: e.target.value as MomentDirection })}
        >
          <option value="clockwise">↻ Clockwise</option>
          <option value="counterclockwise">↺ Counter-clockwise</option>
        </select>
      </div>
    </div>
  );
}

// ============================================================
// UNITS PANEL
// ============================================================

export function UnitsPanel() {
  const { state, dispatch } = useAppContext();
  const { beamModel } = state;

  return (
    <div className="panel-section">
      <h3 className="panel-title">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/>
          <path d="M8 12h8M12 8v8"/>
        </svg>
        Units
      </h3>
      <div className="form-group">
        <label className="form-label">Unit System</label>
        <div className="btn-toggle-group">
          <button
            className={`btn-toggle ${beamModel.unitSystem === 'SI' ? 'active' : ''}`}
            onClick={() => dispatch({ type: 'SET_UNIT_SYSTEM', payload: 'SI' })}
          >
            SI (Metric)
          </button>
          <button
            className={`btn-toggle ${beamModel.unitSystem === 'Imperial' ? 'active' : ''}`}
            onClick={() => dispatch({ type: 'SET_UNIT_SYSTEM', payload: 'Imperial' })}
          >
            Imperial
          </button>
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Length</label>
        <select
          className="form-select"
          value={beamModel.lengthUnit}
          onChange={e => dispatch({ type: 'SET_UNITS', payload: { lengthUnit: e.target.value as LengthUnit } })}
        >
          <option value="mm">mm</option>
          <option value="m">m</option>
          <option value="ft">ft</option>
          <option value="in">in</option>
        </select>
      </div>
      <div className="form-group">
        <label className="form-label">Force</label>
        <select
          className="form-select"
          value={beamModel.forceUnit}
          onChange={e => dispatch({ type: 'SET_UNITS', payload: { forceUnit: e.target.value as ForceUnit } })}
        >
          <option value="N">N</option>
          <option value="kN">kN</option>
          <option value="lb">lb</option>
          <option value="kip">kip</option>
        </select>
      </div>
      <div className="form-group">
        <label className="form-label">Moment</label>
        <select
          className="form-select"
          value={beamModel.momentUnit}
          onChange={e => dispatch({ type: 'SET_UNITS', payload: { momentUnit: e.target.value as MomentUnit } })}
        >
          <option value="N·m">N·m</option>
          <option value="kN·m">kN·m</option>
          <option value="lb·ft">lb·ft</option>
          <option value="kip·ft">kip·ft</option>
        </select>
      </div>
      <div className="form-group">
        <label className="form-label">Distributed Load</label>
        <select
          className="form-select"
          value={beamModel.distLoadUnit}
          onChange={e => dispatch({ type: 'SET_UNITS', payload: { distLoadUnit: e.target.value as DistLoadUnit } })}
        >
          <option value="N/m">N/m</option>
          <option value="kN/m">kN/m</option>
          <option value="lb/ft">lb/ft</option>
          <option value="kip/ft">kip/ft</option>
        </select>
      </div>
    </div>
  );
}

// ============================================================
// PRESETS PANEL
// ============================================================

export function PresetsPanel() {
  const { dispatch } = useAppContext();
  const categories = getPresetsByCategory();

  const loadPreset = (preset: any) => {
    const model = {
      ...preset.model,
      id: generateId('beam'),
      name: preset.name,
    };
    dispatch({ type: 'LOAD_BEAM_MODEL', payload: model });
  };

  return (
    <div className="panel-section">
      <h3 className="panel-title">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 4h16v16H4z"/>
          <path d="M9 4v16M4 9h16"/>
        </svg>
        Quick Examples
      </h3>
      {Object.entries(categories).map(([category, presets]: [string, any]) => (
        <div key={category} className="preset-category">
          <h4 className="preset-category-title">{category}</h4>
          <div className="preset-list">
            {presets.map((preset: any) => (
              <button
                key={preset.id}
                className="preset-btn"
                onClick={() => loadPreset(preset)}
                title={preset.description}
              >
                <span className="preset-name">{preset.name}</span>
                <span className="preset-desc">{preset.description}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
