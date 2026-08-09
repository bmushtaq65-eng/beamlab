// ============================================================
// BEAMLAB — React Context for Global State Management
// ============================================================

import React, { createContext, useContext, useReducer, useCallback, useRef, useEffect } from 'react';
import {
  BeamModel,
  Support,
  Load,
  PointLoad,
  DistributedLoad,
  AppliedMoment,
  AnalysisResult,
  UnitSystem,
  LengthUnit,
  ForceUnit,
  MomentUnit,
  DistLoadUnit,
} from '../types/beam';
import { analyzeBeam } from '../solver/beamSolver';
import { generateId } from '../utils/helpers';
import { getDefaultUnits } from '../utils/units';

// ============================================================
// State
// ============================================================

export interface AppState {
  // View
  currentView: 'landing' | 'workspace';
  theme: 'light' | 'dark';
  sidebarOpen: boolean;
  activeSidebarTab: string;
  
  // Beam Model
  beamModel: BeamModel;
  
  // Analysis
  analysisResult: AnalysisResult | null;
  isAnalyzing: boolean;
  autoAnalyze: boolean;
  
  // Selection
  selectedLoadId: string | null;
  selectedSupportId: string | null;
  
  // UI
  showCalculations: boolean;
  snapGrid: number;  // 0 = no snap
}

const defaultBeamModel: BeamModel = {
  id: generateId('beam'),
  name: 'New Beam',
  geometry: { length: 10 },
  supports: [
    { id: generateId('sup'), type: 'pin', position: 0 },
    { id: generateId('sup'), type: 'roller', position: 10 },
  ],
  loads: [],
  unitSystem: 'SI',
  lengthUnit: 'm',
  forceUnit: 'kN',
  momentUnit: 'kN·m',
  distLoadUnit: 'kN/m',
};

const initialState: AppState = {
  currentView: 'landing',
  theme: (typeof window !== 'undefined' && localStorage.getItem('beamlab-theme') as 'light' | 'dark') || 'light',
  sidebarOpen: true,
  activeSidebarTab: 'beam',
  beamModel: defaultBeamModel,
  analysisResult: null,
  isAnalyzing: false,
  autoAnalyze: true,
  selectedLoadId: null,
  selectedSupportId: null,
  showCalculations: false,
  snapGrid: 0.1,
};

// ============================================================
// Actions
// ============================================================

type Action =
  | { type: 'SET_VIEW'; payload: 'landing' | 'workspace' }
  | { type: 'SET_THEME'; payload: 'light' | 'dark' }
  | { type: 'TOGGLE_SIDEBAR' }
  | { type: 'SET_SIDEBAR_TAB'; payload: string }
  | { type: 'SET_BEAM_LENGTH'; payload: number }
  | { type: 'SET_BEAM_GEOMETRY'; payload: Partial<BeamModel['geometry']> }
  | { type: 'SET_UNIT_SYSTEM'; payload: UnitSystem }
  | { type: 'SET_UNITS'; payload: { lengthUnit?: LengthUnit; forceUnit?: ForceUnit; momentUnit?: MomentUnit; distLoadUnit?: DistLoadUnit } }
  | { type: 'ADD_SUPPORT'; payload: Support }
  | { type: 'UPDATE_SUPPORT'; payload: Support }
  | { type: 'REMOVE_SUPPORT'; payload: string }
  | { type: 'ADD_LOAD'; payload: Load }
  | { type: 'UPDATE_LOAD'; payload: Load }
  | { type: 'REMOVE_LOAD'; payload: string }
  | { type: 'DUPLICATE_LOAD'; payload: string }
  | { type: 'SELECT_LOAD'; payload: string | null }
  | { type: 'SELECT_SUPPORT'; payload: string | null }
  | { type: 'SET_ANALYSIS_RESULT'; payload: AnalysisResult | null }
  | { type: 'SET_ANALYZING'; payload: boolean }
  | { type: 'SET_AUTO_ANALYZE'; payload: boolean }
  | { type: 'TOGGLE_CALCULATIONS' }
  | { type: 'SET_SNAP_GRID'; payload: number }
  | { type: 'LOAD_BEAM_MODEL'; payload: BeamModel }
  | { type: 'RESET_BEAM' };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_VIEW':
      return { ...state, currentView: action.payload };
    
    case 'SET_THEME': {
      localStorage.setItem('beamlab-theme', action.payload);
      document.documentElement.setAttribute('data-theme', action.payload);
      return { ...state, theme: action.payload };
    }
    
    case 'TOGGLE_SIDEBAR':
      return { ...state, sidebarOpen: !state.sidebarOpen };
    
    case 'SET_SIDEBAR_TAB':
      return { ...state, activeSidebarTab: action.payload };
    
    case 'SET_BEAM_LENGTH': {
      const newLength = action.payload;
      // Clamp support and load positions to new length
      const supports = state.beamModel.supports.map(s => ({
        ...s,
        position: Math.min(s.position, newLength),
      }));
      const loads = state.beamModel.loads.map(l => {
        if (l.type === 'point') {
          return { ...l, position: Math.min(l.position, newLength) };
        } else if (l.type === 'distributed') {
          return {
            ...l,
            startPosition: Math.min(l.startPosition, newLength),
            endPosition: Math.min(l.endPosition, newLength),
          };
        } else if (l.type === 'moment') {
          return { ...l, position: Math.min(l.position, newLength) };
        }
        return l;
      });
      return {
        ...state,
        beamModel: {
          ...state.beamModel,
          geometry: { ...state.beamModel.geometry, length: newLength },
          supports,
          loads,
        },
        analysisResult: null,
      };
    }
    
    case 'SET_BEAM_GEOMETRY':
      return {
        ...state,
        beamModel: {
          ...state.beamModel,
          geometry: { ...state.beamModel.geometry, ...action.payload },
        },
      };
    
    case 'SET_UNIT_SYSTEM': {
      const units = getDefaultUnits(action.payload);
      return {
        ...state,
        beamModel: {
          ...state.beamModel,
          unitSystem: action.payload,
          ...units,
        },
        analysisResult: null,
      };
    }
    
    case 'SET_UNITS':
      return {
        ...state,
        beamModel: {
          ...state.beamModel,
          ...action.payload,
        },
        analysisResult: null,
      };
    
    case 'ADD_SUPPORT':
      return {
        ...state,
        beamModel: {
          ...state.beamModel,
          supports: [...state.beamModel.supports, action.payload],
        },
        analysisResult: null,
      };
    
    case 'UPDATE_SUPPORT':
      return {
        ...state,
        beamModel: {
          ...state.beamModel,
          supports: state.beamModel.supports.map(s =>
            s.id === action.payload.id ? action.payload : s
          ),
        },
        analysisResult: null,
      };
    
    case 'REMOVE_SUPPORT':
      return {
        ...state,
        beamModel: {
          ...state.beamModel,
          supports: state.beamModel.supports.filter(s => s.id !== action.payload),
        },
        selectedSupportId: state.selectedSupportId === action.payload ? null : state.selectedSupportId,
        analysisResult: null,
      };
    
    case 'ADD_LOAD':
      return {
        ...state,
        beamModel: {
          ...state.beamModel,
          loads: [...state.beamModel.loads, action.payload],
        },
        analysisResult: null,
      };
    
    case 'UPDATE_LOAD':
      return {
        ...state,
        beamModel: {
          ...state.beamModel,
          loads: state.beamModel.loads.map(l =>
            l.id === action.payload.id ? action.payload : l
          ),
        },
        analysisResult: null,
      };
    
    case 'REMOVE_LOAD':
      return {
        ...state,
        beamModel: {
          ...state.beamModel,
          loads: state.beamModel.loads.filter(l => l.id !== action.payload),
        },
        selectedLoadId: state.selectedLoadId === action.payload ? null : state.selectedLoadId,
        analysisResult: null,
      };
    
    case 'DUPLICATE_LOAD': {
      const original = state.beamModel.loads.find(l => l.id === action.payload);
      if (!original) return state;
      const duplicate = { ...JSON.parse(JSON.stringify(original)), id: generateId('load') };
      return {
        ...state,
        beamModel: {
          ...state.beamModel,
          loads: [...state.beamModel.loads, duplicate],
        },
        analysisResult: null,
      };
    }
    
    case 'SELECT_LOAD':
      return { ...state, selectedLoadId: action.payload, selectedSupportId: null };
    
    case 'SELECT_SUPPORT':
      return { ...state, selectedSupportId: action.payload, selectedLoadId: null };
    
    case 'SET_ANALYSIS_RESULT':
      return { ...state, analysisResult: action.payload, isAnalyzing: false };
    
    case 'SET_ANALYZING':
      return { ...state, isAnalyzing: action.payload };
    
    case 'SET_AUTO_ANALYZE':
      return { ...state, autoAnalyze: action.payload };
    
    case 'TOGGLE_CALCULATIONS':
      return { ...state, showCalculations: !state.showCalculations };
    
    case 'SET_SNAP_GRID':
      return { ...state, snapGrid: action.payload };
    
    case 'LOAD_BEAM_MODEL':
      return {
        ...state,
        beamModel: action.payload,
        analysisResult: null,
        selectedLoadId: null,
        selectedSupportId: null,
        currentView: 'workspace',
      };
    
    case 'RESET_BEAM':
      return {
        ...state,
        beamModel: {
          ...defaultBeamModel,
          id: generateId('beam'),
          supports: [
            { id: generateId('sup'), type: 'pin', position: 0 },
            { id: generateId('sup'), type: 'roller', position: defaultBeamModel.geometry.length },
          ],
        },
        analysisResult: null,
        selectedLoadId: null,
        selectedSupportId: null,
      };
    
    default:
      return state;
  }
}

// ============================================================
// Context
// ============================================================

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  runAnalysis: (explicit?: boolean) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const analysisTimeoutRef = useRef<number | null>(null);

  // Apply theme on mount
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', state.theme);
  }, []);

  const runAnalysis = useCallback((explicit: boolean = false) => {
    dispatch({ type: 'SET_ANALYZING', payload: true });
    // Use setTimeout to allow UI to show loading state
    setTimeout(() => {
      const result = analyzeBeam(state.beamModel);
      dispatch({ type: 'SET_ANALYSIS_RESULT', payload: result });
      if (explicit && result.success && state.currentView === 'workspace') {
        dispatch({ type: 'SET_SIDEBAR_TAB', payload: 'analysis' });
      }
    }, 50);
  }, [state.beamModel, state.currentView]);

  // Auto-analyze when beam model changes
  useEffect(() => {
    if (state.autoAnalyze && state.currentView === 'workspace') {
      if (analysisTimeoutRef.current) {
        clearTimeout(analysisTimeoutRef.current);
      }
      analysisTimeoutRef.current = window.setTimeout(() => {
        runAnalysis();
      }, 300); // Debounce 300ms
    }
    return () => {
      if (analysisTimeoutRef.current) {
        clearTimeout(analysisTimeoutRef.current);
      }
    };
  }, [state.beamModel, state.autoAnalyze, state.currentView, runAnalysis]);

  return (
    <AppContext.Provider value={{ state, dispatch, runAnalysis }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext(): AppContextType {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
}
