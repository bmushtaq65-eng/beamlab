// ============================================================
// BEAMLAB — Landing Page
// ============================================================

import React from 'react';
import { useAppContext } from '../context/AppContext';
import { BEAM_PRESETS } from '../solver/presets';
import { generateId } from '../utils/helpers';

export function LandingPage() {
  const { dispatch } = useAppContext();

  const handleStartAnalysis = () => {
    dispatch({ type: 'SET_VIEW', payload: 'workspace' });
  };

  const handleTryExample = () => {
    // Load the mixed loading example
    const preset = BEAM_PRESETS.find(p => p.id === 'ss-mixed') || BEAM_PRESETS[0];
    const model = {
      ...preset.model,
      id: generateId('beam'),
      name: preset.name,
    };
    dispatch({ type: 'LOAD_BEAM_MODEL', payload: model });
  };

  return (
    <div className="landing-page">
      {/* Header */}
      <header className="landing-header">
        <div className="landing-header-inner">
          <div className="landing-logo">
            <div className="logo-icon">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <rect x="2" y="13" width="28" height="6" rx="1" fill="var(--color-primary)"/>
                <polygon points="6,19 3,26 9,26" fill="var(--color-primary)" opacity="0.8"/>
                <polygon points="26,19 23,26 29,26" fill="var(--color-primary)" opacity="0.8"/>
                <circle cx="26" cy="27" r="2" fill="var(--color-primary)" opacity="0.6"/>
                <line x1="16" y1="5" x2="16" y2="13" stroke="var(--color-danger)" strokeWidth="2.5" strokeLinecap="round"/>
                <polygon points="13,7 16,13 19,7" fill="var(--color-danger)"/>
              </svg>
            </div>
            <span className="logo-text">BEAM<span className="logo-accent">LAB</span></span>
          </div>
          <nav className="landing-nav">
            <button className="btn btn-ghost" onClick={handleStartAnalysis}>Start Analysis</button>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-badge">Structural Beam Analysis, Made Visual</div>
          <h1 className="hero-title">
            Analyze Beams<br/>
            <span className="hero-title-accent">Like an Engineer.</span>
          </h1>
          <p className="hero-subtitle">
            Instant reactions, shear force, bending moment, and professional diagrams — 
            from one interactive beam model.
          </p>
          <div className="hero-cta-group">
            <button className="btn btn-primary btn-lg" onClick={handleStartAnalysis}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
              Start Analysis
            </button>
            <button className="btn btn-outline btn-lg" onClick={handleTryExample}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <path d="M9 3v18M3 9h18"/>
              </svg>
              Try Example
            </button>
          </div>
        </div>

        {/* Hero Visualization */}
        <div className="hero-visualization">
          <HeroBeamAnimation />
        </div>
      </section>

      {/* Features */}
      <section className="features-section">
        <h2 className="features-title">Everything You Need</h2>
        <div className="features-grid">
          <FeatureCard
            icon={
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="2" y="10" width="20" height="4" rx="1"/>
                <polygon points="6,14 4,20 8,20"/>
                <polygon points="18,14 16,20 20,20"/>
              </svg>
            }
            title="Interactive Beam Editor"
            description="Place supports and loads visually. Drag to reposition. Everything updates in real-time."
          />
          <FeatureCard
            icon={
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <polyline points="3,18 7,12 11,15 15,8 21,14"/>
                <line x1="3" y1="22" x2="21" y2="22"/>
              </svg>
            }
            title="SFD & BMD Diagrams"
            description="Professional shear force and bending moment diagrams with hover tooltips and critical value markers."
          />
          <FeatureCard
            icon={
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M4 4h16v16H4z"/>
                <path d="M8 8h8M8 12h5M8 16h8"/>
              </svg>
            }
            title="Step-by-Step Calculations"
            description="Full equilibrium equations, piecewise shear and moment functions, with every substitution shown."
          />
          <FeatureCard
            icon={
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
            }
            title="Professional Reports"
            description="Generate print-ready engineering calculation documents with complete analysis summaries."
          />
          <FeatureCard
            icon={
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="3"/>
                <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
              </svg>
            }
            title="Multiple Load Types"
            description="Point loads, UDL, triangular, trapezoidal distributed loads, and applied moments — all at once."
          />
          <FeatureCard
            icon={
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14l-5-4.87 6.91-1.01L12 2z"/>
              </svg>
            }
            title="Critical Value Detection"
            description="Automatic detection of maximum shear, maximum moment, zero crossings, and their exact locations."
          />
        </div>
      </section>

      {/* Supported Beam Types */}
      <section className="beam-types-section">
        <h2 className="features-title">Supported Beam Configurations</h2>
        <div className="beam-types-grid">
          {[
            { name: 'Simply Supported', desc: 'Pin + Roller supports', icon: '△━━━━━━━○' },
            { name: 'Cantilever', desc: 'Fixed end support', icon: '▌━━━━━━━━' },
            { name: 'Overhanging', desc: 'Extended beyond supports', icon: '━△━━━━━○━━' },
            { name: 'Multiple Loads', desc: 'Combined loading', icon: '↓ ↓ ⟶ ↻' },
          ].map(bt => (
            <div key={bt.name} className="beam-type-card">
              <div className="beam-type-icon mono">{bt.icon}</div>
              <h3>{bt.name}</h3>
              <p>{bt.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div className="footer-brand">
            <span className="logo-text logo-text-sm">BEAM<span className="logo-accent">LAB</span></span>
            <p>Structural Beam Analysis, Made Visual.</p>
          </div>
          <div className="footer-disclaimer">
            Results are intended for educational and preliminary analysis purposes 
            and should be independently verified by a qualified engineer before use 
            in construction or safety-critical applications.
            <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'center' }}>
              <img src="https://profile-counter.glitch.me/bmushtaq65-eng.beamlab/count.svg" alt="visits" />
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ============================================================
// Feature Card
// ============================================================

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="feature-card">
      <div className="feature-icon">{icon}</div>
      <h3 className="feature-title">{title}</h3>
      <p className="feature-description">{description}</p>
    </div>
  );
}

// ============================================================
// Hero Beam Animation (SVG)
// ============================================================

function HeroBeamAnimation() {
  return (
    <svg viewBox="0 0 600 280" className="hero-beam-svg" aria-hidden="true">
      {/* Grid background */}
      <defs>
        <pattern id="heroGrid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="var(--color-border)" strokeWidth="0.3" opacity="0.5"/>
        </pattern>
      </defs>
      <rect width="600" height="280" fill="url(#heroGrid)" rx="8"/>

      {/* Beam */}
      <rect x="60" y="120" width="480" height="16" rx="3" fill="var(--color-primary)" className="hero-beam-bar">
        <animate attributeName="opacity" from="0" to="1" dur="0.6s" fill="freeze"/>
      </rect>

      {/* Pin support */}
      <g className="hero-support" style={{ animationDelay: '0.3s' }}>
        <polygon points="100,136 85,165 115,165" fill="none" stroke="var(--color-primary)" strokeWidth="2.5"/>
        <line x1="80" y1="168" x2="120" y2="168" stroke="var(--color-primary)" strokeWidth="2"/>
      </g>

      {/* Roller support */}
      <g className="hero-support" style={{ animationDelay: '0.4s' }}>
        <polygon points="500,136 485,160 515,160" fill="none" stroke="var(--color-primary)" strokeWidth="2.5"/>
        <circle cx="493" cy="168" r="5" fill="none" stroke="var(--color-primary)" strokeWidth="2"/>
        <circle cx="507" cy="168" r="5" fill="none" stroke="var(--color-primary)" strokeWidth="2"/>
        <line x1="480" y1="176" x2="520" y2="176" stroke="var(--color-primary)" strokeWidth="2"/>
      </g>

      {/* Point load 1 */}
      <g className="hero-load" style={{ animationDelay: '0.6s' }}>
        <line x1="220" y1="40" x2="220" y2="118" stroke="var(--color-danger)" strokeWidth="2.5"/>
        <polygon points="215,115 220,125 225,115" fill="var(--color-danger)"/>
        <text x="220" y="32" textAnchor="middle" fill="var(--color-danger)" fontSize="13" fontWeight="600">20 kN</text>
      </g>

      {/* Point load 2 */}
      <g className="hero-load" style={{ animationDelay: '0.8s' }}>
        <line x1="420" y1="50" x2="420" y2="118" stroke="var(--color-danger)" strokeWidth="2.5"/>
        <polygon points="415,115 420,125 425,115" fill="var(--color-danger)"/>
        <text x="420" y="42" textAnchor="middle" fill="var(--color-danger)" fontSize="13" fontWeight="600">15 kN</text>
      </g>

      {/* UDL */}
      <g className="hero-load" style={{ animationDelay: '1s' }}>
        {Array.from({ length: 12 }, (_, i) => {
          const x = 100 + i * (400 / 11);
          return (
            <g key={i}>
              <line x1={x} y1="85" x2={x} y2="118" stroke="var(--color-accent)" strokeWidth="1.5" opacity="0.7"/>
              <polygon points={`${x - 3},115 ${x},122 ${x + 3},115`} fill="var(--color-accent)" opacity="0.7"/>
            </g>
          );
        })}
        <line x1="100" y1="85" x2="500" y2="85" stroke="var(--color-accent)" strokeWidth="2"/>
        <text x="300" y="78" textAnchor="middle" fill="var(--color-accent)" fontSize="12" fontWeight="600">5 kN/m</text>
      </g>

      {/* Reaction arrows */}
      <g className="hero-reaction" style={{ animationDelay: '1.3s' }}>
        <line x1="100" y1="205" x2="100" y2="170" stroke="var(--color-success)" strokeWidth="2.5" strokeDasharray="4 2"/>
        <polygon points="95,175 100,165 105,175" fill="var(--color-success)"/>
        <text x="100" y="220" textAnchor="middle" fill="var(--color-success)" fontSize="12" fontWeight="600">R_A ↑</text>
      </g>
      <g className="hero-reaction" style={{ animationDelay: '1.4s' }}>
        <line x1="500" y1="205" x2="500" y2="178" stroke="var(--color-success)" strokeWidth="2.5" strokeDasharray="4 2"/>
        <polygon points="495,183 500,173 505,183" fill="var(--color-success)"/>
        <text x="500" y="220" textAnchor="middle" fill="var(--color-success)" fontSize="12" fontWeight="600">R_B ↑</text>
      </g>

      {/* Dimension line */}
      <g opacity="0.5">
        <line x1="100" y1="245" x2="500" y2="245" stroke="var(--text-secondary)" strokeWidth="1"/>
        <line x1="100" y1="240" x2="100" y2="250" stroke="var(--text-secondary)" strokeWidth="1"/>
        <line x1="500" y1="240" x2="500" y2="250" stroke="var(--text-secondary)" strokeWidth="1"/>
        <text x="300" y="260" textAnchor="middle" fill="var(--text-secondary)" fontSize="11">L = 8 m</text>
      </g>
    </svg>
  );
}
