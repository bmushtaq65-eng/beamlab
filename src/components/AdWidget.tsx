import React from 'react';

interface AdWidgetProps {
  location: string;
  className?: string;
  style?: React.CSSProperties;
}

export function AdWidget({ location, className = '', style }: AdWidgetProps) {
  // Adsterra uses raw `<script>` tags which can be complex to inject natively in React without breaking hydration.
  // We provide a safe, reserved placeholder container. 
  // Once the user gets the exact snippet from Adsterra, it can be securely injected here using dangerousSetInnerHTML
  // or by dynamically creating a script tag in a useEffect hook.
  
  return (
    <div className={`beamlab-ad-container ${className}`} style={{ ...style, minHeight: '90px' }}>
      <div className="beamlab-ad-label">Advertisement - {location}</div>
      <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center' }}>
        {/* Placeholder for Adsterra Script */}
        [YOUR_ADSTERRA_SCRIPT_CODE_HERE]
      </div>
    </div>
  );
}
