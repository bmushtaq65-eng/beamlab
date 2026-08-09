import React, { useEffect, useRef } from 'react';

interface AdWidgetProps {
  location: string;
  className?: string;
  style?: React.CSSProperties;
}

export function AdWidget({ location, className = '', style }: AdWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // For Native Banners, we need to inject the script dynamically
    if (location === 'Sidebar Vertical' || location === 'Below Results Banner') {
      if (containerRef.current && !containerRef.current.querySelector('script')) {
        const script = document.createElement('script');
        script.type = 'text/javascript';
        script.async = true;
        script.dataset.cfasync = 'false';
        script.src = 'https://pl30764506.effectivecpmnetwork.com/97cb37111370af4e05ee619be2465a54/invoke.js';
        containerRef.current.appendChild(script);
      }
    }
  }, [location]);

  // Use Native Banner for Sidebar and Results
  if (location === 'Sidebar Vertical' || location === 'Below Results Banner') {
    return (
      <div className={`beamlab-ad-container ${className}`} style={{ ...style, minHeight: '90px' }}>
        <div className="beamlab-ad-label">Advertisement</div>
        <div ref={containerRef} style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
          <div id="container-97cb37111370af4e05ee619be2465a54"></div>
        </div>
      </div>
    );
  }

  // Use iframe banner (468x60) for Top and Landing Page
  const iframeSrc = `<html><head></head><body style="margin:0;padding:0;overflow:hidden;text-align:center;"><script type="text/javascript">atOptions = {'key' : '18c8e6980f3ccddea9762be7d07012ed', 'format' : 'iframe', 'height' : 60, 'width' : 468, 'params' : {}};</script><script type="text/javascript" src="https://www.highperformanceformat.com/18c8e6980f3ccddea9762be7d07012ed/invoke.js"></script></body></html>`;

  return (
    <div className={`beamlab-ad-container ${className}`} style={{ ...style, minHeight: '90px' }}>
      <div className="beamlab-ad-label">Advertisement</div>
      <iframe 
        srcDoc={iframeSrc}
        width="468" 
        height="60" 
        frameBorder="0" 
        scrolling="no"
        style={{ maxWidth: '100%' }}
      />
    </div>
  );
}
