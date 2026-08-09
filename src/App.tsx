// ============================================================
// BEAMLAB — Main Application
// Structural Beam Analysis, Made Visual.
// ============================================================

import React from 'react';
import { AppProvider, useAppContext } from './context/AppContext';
import { LandingPage } from './components/LandingPage';
import { Workspace } from './components/Workspace';
import './App.css';

function AppContent() {
  const { state } = useAppContext();

  return (
    <div className="app" data-view={state.currentView}>
      {state.currentView === 'landing' && <LandingPage />}
      {state.currentView === 'workspace' && <Workspace />}
    </div>
  );
}

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
