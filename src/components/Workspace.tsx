// ============================================================
// BEAMLAB — Main Workspace Component
// Dashboard layout with sidebar, beam viz, diagrams, results
// ============================================================

import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { BeamVisualization } from './BeamVisualization';
import { DiagramChart } from './DiagramChart';
import { BeamPanel, SupportsPanel, LoadsPanel, UnitsPanel, PresetsPanel } from './SidebarPanels';
import { ReactionsCard, CriticalValuesCard, LoadTable, CalculationsPanel, AnalysisError, CoordinateInspector } from './ResultsDisplay';
import { generateReport, openReportInWindow } from '../utils/reportGenerator';
import { exportProjectJSON, importProjectJSON } from '../utils/storage';
import { PointLoad, DistributedLoad, AppliedMoment } from '../types/beam';
import { AdWidget } from './AdWidget';

export function Workspace() {
  const { state, dispatch, runAnalysis } = useAppContext();
  const { beamModel, analysisResult, sidebarOpen, activeSidebarTab, theme } = state;
  const [showCalcs, setShowCalcs] = useState(false);

  // Sidebar tabs
  const sidebarTabs = [
    { id: 'beam', label: 'Model', icon: '⬡' },
    { id: 'analysis', label: 'Results', icon: '📊' },
    { id: 'presets', label: 'Examples', icon: '📋' },
  ];

  // Handle load position change from visualization drag
  const handleLoadPositionChange = (id: string, newPos: number) => {
    const load = beamModel.loads.find(l => l.id === id);
    if (!load) return;
    
    if (load.type === 'point') {
      dispatch({ type: 'UPDATE_LOAD', payload: { ...load, position: newPos } });
    } else if (load.type === 'moment') {
      dispatch({ type: 'UPDATE_LOAD', payload: { ...load, position: newPos } });
    }
  };

  const handleSupportPositionChange = (id: string, newPos: number) => {
    const support = beamModel.supports.find(s => s.id === id);
    if (!support) return;
    dispatch({ type: 'UPDATE_SUPPORT', payload: { ...support, position: newPos } });
  };

  const handleGenerateReport = () => {
    if (analysisResult && analysisResult.success) {
      const html = generateReport(beamModel, analysisResult);
      openReportInWindow(html);
    }
  };

  const handleExportJSON = () => {
    const project = {
      id: beamModel.id,
      name: beamModel.name,
      beamModel,
      analysisResult: analysisResult || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const json = exportProjectJSON(project);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `beamlab-${beamModel.name.replace(/\s+/g, '-').toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJSON = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const project = importProjectJSON(reader.result as string);
        if (project) {
          dispatch({ type: 'LOAD_BEAM_MODEL', payload: project.beamModel });
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const toggleTheme = () => {
    dispatch({ type: 'SET_THEME', payload: theme === 'light' ? 'dark' : 'light' });
  };

  return (
    <div className="workspace">
      {/* Top Bar */}
      <header className="workspace-header">
        <div className="workspace-header-left">
          <button
            className="btn btn-icon btn-ghost sidebar-toggle"
            onClick={() => dispatch({ type: 'TOGGLE_SIDEBAR' })}
            title="Toggle Sidebar"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
          <div className="workspace-logo" onClick={() => dispatch({ type: 'SET_VIEW', payload: 'landing' })}>
            <span className="logo-text logo-text-sm">BEAM<span className="logo-accent">LAB</span></span>
          </div>
        </div>

        <div className="workspace-header-center">
          <input
            className="beam-name-input"
            value={beamModel.name}
            onChange={e => dispatch({ type: 'LOAD_BEAM_MODEL', payload: { ...beamModel, name: e.target.value } })}
            placeholder="Beam name..."
          />
        </div>

        <div className="workspace-header-right">
          <button className="btn btn-sm btn-ghost" onClick={toggleTheme} title="Toggle theme">
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
          <button className="btn btn-sm btn-outline" onClick={handleImportJSON} title="Import JSON">
            Import
          </button>
          <button className="btn btn-sm btn-outline" onClick={handleExportJSON} title="Export JSON">
            Export
          </button>
          {analysisResult?.success && (
            <button className="btn btn-sm btn-primary" onClick={handleGenerateReport}>
              📄 Report
            </button>
          )}
        </div>
      </header>

      <div className="workspace-body">
        {/* Sidebar */}
        <aside className={`workspace-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
          <div className="sidebar-tabs">
            {sidebarTabs.map(tab => (
              <button
                key={tab.id}
                className={`sidebar-tab ${activeSidebarTab === tab.id ? 'active' : ''}`}
                onClick={() => dispatch({ type: 'SET_SIDEBAR_TAB', payload: tab.id })}
              >
                <span className="sidebar-tab-icon">{tab.icon}</span>
                <span className="sidebar-tab-label">{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="sidebar-content">
            {activeSidebarTab === 'beam' && (
              <>
                <BeamPanel />
                <SupportsPanel />
                <LoadsPanel />
                <UnitsPanel />
              </>
            )}
            {activeSidebarTab === 'analysis' && (
              <>
                {analysisResult?.success ? (
                  <>
                    <div className="panel-section">
                      <h3 className="panel-title success-title">✓ Analysis Complete</h3>
                    </div>
                    <ReactionsCard />
                    <CriticalValuesCard />
                    <CoordinateInspector />
                  </>
                ) : (
                  <div className="panel-section">
                    <div className="empty-state">
                      {analysisResult?.error ? (
                        <div className="alert alert-error compact">{analysisResult.error}</div>
                      ) : (
                        <>Add loads and supports, then click Analyze.</>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
            {activeSidebarTab === 'presets' && <PresetsPanel />}
          </div>

          <div className="sidebar-footer">
            <button className="btn btn-primary btn-block" onClick={() => runAnalysis(true)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
              Analyze
            </button>
            <button
              className="btn btn-ghost btn-block btn-sm"
              onClick={() => dispatch({ type: 'RESET_BEAM' })}
            >
              Reset Beam
            </button>
          </div>
          
          {/* Sidebar Ad Placement */}
          <div style={{ padding: '0 1rem 1rem 1rem' }}>
            <AdWidget location="Sidebar Vertical" style={{ minHeight: '250px' }} />
          </div>
        </aside>

        {/* Main Content */}
        <main className="workspace-main">
          {/* Top Main Ad Placement */}
          <section className="workspace-section" style={{ paddingBottom: 0 }}>
            <AdWidget location="Workspace Top Banner" style={{ minHeight: '90px' }} />
          </section>

          {/* Free-Body Diagram */}
          <section className="workspace-section beam-viz-section">
            <div className="section-header">
              <h2 className="section-title">Free-Body Diagram</h2>
              <div className="section-actions">
                <span className="badge">
                  {beamModel.geometry.length} {beamModel.lengthUnit} • 
                  {beamModel.supports.length} supports • 
                  {beamModel.loads.length} loads
                </span>
              </div>
            </div>
            <div className="beam-viz-container">
              <BeamVisualization
                beam={beamModel}
                reactions={analysisResult?.success ? analysisResult.reactions : undefined}
                selectedLoadId={state.selectedLoadId || undefined}
                onLoadSelect={(id) => dispatch({ type: 'SELECT_LOAD', payload: id })}
                onLoadPositionChange={handleLoadPositionChange}
                onSupportPositionChange={handleSupportPositionChange}
                showReactions={!!analysisResult?.success}
                showDimensions={true}
              />
            </div>
          </section>

          {/* Error */}
          <AnalysisError />

          {/* Load Table */}
          {beamModel.loads.length > 0 && <LoadTable />}

          {/* Results */}
          {analysisResult?.success && (
            <>
              {/* Reactions on main area (for mobile) */}
              <div className="mobile-only">
                <ReactionsCard />
                <CriticalValuesCard />
              </div>

              {/* SFD */}
              <section className="workspace-section">
                <div className="section-header">
                  <h2 className="section-title">Shear Force Diagram</h2>
                </div>
                <DiagramChart
                  title="Shear Force Diagram (SFD)"
                  data={analysisResult.shearForce.diagram}
                  criticalPoints={[
                    ...(analysisResult.shearForce.maxPositive ? [analysisResult.shearForce.maxPositive] : []),
                    ...(analysisResult.shearForce.maxNegative ? [analysisResult.shearForce.maxNegative] : []),
                    ...analysisResult.shearForce.zeroPoints,
                  ]}
                  xLabel="Position"
                  yLabel="Shear Force"
                  xUnit={beamModel.lengthUnit}
                  yUnit={beamModel.forceUnit}
                  beamLength={beamModel.geometry.length}
                  height={280}
                  showGrid={true}
                  svgId="sfd-chart-svg"
                />
              </section>

              {/* BMD */}
              <section className="workspace-section">
                <div className="section-header">
                  <h2 className="section-title">Bending Moment Diagram</h2>
                </div>
                <DiagramChart
                  title="Bending Moment Diagram (BMD)"
                  data={analysisResult.bendingMoment.diagram}
                  criticalPoints={[
                    ...(analysisResult.bendingMoment.maxPositive ? [analysisResult.bendingMoment.maxPositive] : []),
                    ...(analysisResult.bendingMoment.maxNegative ? [analysisResult.bendingMoment.maxNegative] : []),
                  ]}
                  xLabel="Position"
                  yLabel="Bending Moment"
                  xUnit={beamModel.lengthUnit}
                  yUnit={beamModel.momentUnit}
                  positiveColor="var(--color-accent, #0891b2)"
                  negativeColor="var(--color-warning, #f59e0b)"
                  beamLength={beamModel.geometry.length}
                  height={280}
                  showGrid={true}
                  svgId="bmd-chart-svg"
                />
              </section>

              {/* Main Area Ad Placement */}
              <section className="workspace-section">
                <AdWidget location="Below Results Banner" />
              </section>

              {/* Coordinate Inspector (mobile) */}
              <div className="mobile-only">
                <CoordinateInspector />
              </div>

              {/* Step-by-Step Calculations */}
              <section className="workspace-section">
                <button
                  className="btn btn-outline btn-block calculations-toggle"
                  onClick={() => setShowCalcs(!showCalcs)}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="4" y="2" width="16" height="20" rx="2"/>
                    <line x1="8" y1="6" x2="16" y2="6"/>
                    <line x1="8" y1="10" x2="16" y2="10"/>
                    <line x1="8" y1="14" x2="12" y2="14"/>
                  </svg>
                  {showCalcs ? 'Hide Calculations' : 'Show Step-by-Step Calculations'}
                </button>
                {showCalcs && <CalculationsPanel />}
              </section>

              {/* Generate Report */}
              <section className="workspace-section report-section">
                <button className="btn btn-primary btn-lg btn-block" onClick={handleGenerateReport}>
                  📄 Generate Engineering Report
                </button>
                <p className="report-disclaimer">
                  Results are intended for educational and preliminary analysis purposes 
                  and should be independently verified by a qualified engineer.
                </p>
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
