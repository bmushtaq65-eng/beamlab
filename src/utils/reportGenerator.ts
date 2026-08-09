import { BeamModel, AnalysisResult, Support, Load } from '../types/beam';
import { formatValue } from './units';

export function generateReport(model: BeamModel, result: AnalysisResult): string {
  const date = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const time = new Date().toLocaleTimeString('en-US');

  // Format a critical point
  const formatCP = (label: string, value: number, x: number, unit: string, lenUnit: string) => {
    return `<div><strong>${label}:</strong> ${formatValue(value)} ${unit} at x = ${formatValue(x)} ${lenUnit}</div>`;
  };

  // Fetch SVG elements from the DOM to embed them in the report
  const getSvgHtml = (id: string, fallback: string) => {
    const el = document.getElementById(id);
    if (!el) return `<div class="diagram-placeholder">${fallback}</div>`;
    // Clone and adjust dimensions for printing
    const clone = el.cloneNode(true) as SVGSVGElement;
    clone.style.width = '100%';
    clone.style.height = 'auto';
    clone.style.maxHeight = '300px';
    return clone.outerHTML;
  };

  const beamSvg = getSvgHtml('beam-viz-svg', '[Loading Diagram]');
  const sfdSvg = getSvgHtml('sfd-chart-svg', '[SFD Diagram]');
  const bmdSvg = getSvgHtml('bmd-chart-svg', '[BMD Diagram]');

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>BEAMLAB Report - ${model.name}</title>
  <style>
    :root {
      --primary-color: #2563eb;
      --text-color: #1f2937;
      --border-color: #e5e7eb;
      --bg-light: #f9fafb;
    }
    body {
      font-family: "Palatino Linotype", "Book Antiqua", Palatino, serif;
      line-height: 1.6;
      color: var(--text-color);
      max-width: 8.5in;
      margin: 0 auto;
      padding: 40px;
    }
    h1, h2, h3, h4 {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: var(--primary-color);
      margin-top: 1.5em;
      margin-bottom: 0.5em;
      page-break-after: avoid;
    }
    h1 {
      font-size: 24px;
      border-bottom: 2px solid var(--primary-color);
      padding-bottom: 10px;
      margin-top: 0;
    }
    h2 {
      font-size: 20px;
      border-bottom: 1px solid var(--border-color);
      padding-bottom: 5px;
    }
    h3 {
      font-size: 16px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-bottom: 30px;
    }
    .project-info p {
      margin: 5px 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 14px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
      page-break-inside: avoid;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 14px;
    }
    th, td {
      border: 1px solid var(--border-color);
      padding: 10px;
      text-align: left;
    }
    th {
      background-color: var(--bg-light);
      font-weight: 600;
    }
    .math {
      font-family: "Courier New", Courier, monospace;
      background: var(--bg-light);
      padding: 10px;
      border-radius: 4px;
      border-left: 3px solid var(--primary-color);
      margin: 10px 0;
      page-break-inside: avoid;
    }
    .critical-values {
      background: var(--bg-light);
      padding: 15px;
      border-radius: 4px;
      margin: 15px 0;
      page-break-inside: avoid;
    }
    .diagram-placeholder {
      width: 100%;
      height: 300px;
      border: 1px dashed #9ca3af;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 20px 0;
      color: #6b7280;
      font-family: sans-serif;
      page-break-inside: avoid;
    }
    .calculation-step {
      margin-bottom: 20px;
      page-break-inside: avoid;
    }
    .calculation-step h4 {
      margin-bottom: 5px;
      color: var(--text-color);
    }
    .calculation-step p {
      margin: 5px 0;
    }
    .disclaimer {
      font-size: 12px;
      color: #6b7280;
      text-align: center;
      margin-top: 50px;
      border-top: 1px solid var(--border-color);
      padding-top: 20px;
      font-style: italic;
    }
    .footer {
      font-family: sans-serif;
      font-size: 10px;
      text-align: center;
      color: #9ca3af;
      margin-top: 20px;
    }
    @media print {
      body {
        padding: 0;
      }
      .page-break {
        page-break-before: always;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>BEAMLAB Analysis Report</h1>
      <div class="project-info">
        <p><strong>Project:</strong> ${model.name}</p>
        <p><strong>Date:</strong> ${date} ${time}</p>
      </div>
    </div>
  </div>

  <h2>1. Beam Geometry</h2>
  <table>
    <tr>
      <th>Total Length</th>
      <td>${formatValue(model.geometry.length)} ${model.lengthUnit}</td>
    </tr>
    ${model.geometry.material ? `<tr><th>Material</th><td>${model.geometry.material}</td></tr>` : ''}
  </table>

  <h2>2. Support Conditions</h2>
  <table>
    <thead>
      <tr>
        <th>Support ID</th>
        <th>Type</th>
        <th>Position (${model.lengthUnit})</th>
      </tr>
    </thead>
    <tbody>
      ${model.supports.map(s => `
        <tr>
          <td>${s.id}</td>
          <td style="text-transform: capitalize">${s.type}</td>
          <td>${formatValue(s.position)}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <h2>3. Free-Body Diagram</h2>
  <div style="margin: 20px 0; text-align: center; background: white; padding: 10px; border: 1px solid #e5e7eb;">
    ${beamSvg}
  </div>
  <table>
    <thead>
      <tr>
        <th>Load ID</th>
        <th>Type</th>
        <th>Details</th>
        <th>Position (${model.lengthUnit})</th>
      </tr>
    </thead>
    <tbody>
      ${model.loads.map(l => {
        let details = '';
        let position = '';
        if (l.type === 'point') {
          details = `${formatValue(l.magnitude)} ${model.forceUnit} (${l.direction})`;
          position = formatValue(l.position);
        } else if (l.type === 'distributed') {
          details = `${formatValue(l.startMagnitude)} to ${formatValue(l.endMagnitude)} ${model.distLoadUnit} (${l.direction})`;
          position = `${formatValue(l.startPosition)} - ${formatValue(l.endPosition)}`;
        } else if (l.type === 'moment') {
          details = `${formatValue(l.magnitude)} ${model.momentUnit} (${l.direction})`;
          position = formatValue(l.position);
        }
        return `
        <tr>
          <td>${l.id}</td>
          <td style="text-transform: capitalize">${l.type}</td>
          <td>${details}</td>
          <td>${position}</td>
        </tr>
        `;
      }).join('')}
    </tbody>
  </table>

  <div class="page-break"></div>

  <h2>4. Support Reactions</h2>
  <p><strong>Determinacy:</strong> ${result.isStaticallyDeterminate ? 'Statically Determinate' : 'Statically Indeterminate'}</p>
  <p><strong>Sign Convention:</strong> ${result.signConvention}</p>

  <table>
    <thead>
      <tr>
        <th>Support</th>
        <th>Position (${model.lengthUnit})</th>
        <th>Vertical Force (${model.forceUnit})</th>
        <th>Horizontal Force (${model.forceUnit})</th>
        <th>Moment (${model.momentUnit})</th>
      </tr>
    </thead>
    <tbody>
      ${result.reactions.map(r => `
        <tr>
          <td>${r.supportId}</td>
          <td>${formatValue(r.position)}</td>
          <td>${formatValue(r.verticalForce)}</td>
          <td>${formatValue(r.horizontalForce)}</td>
          <td>${formatValue(r.moment)}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <h2>5. Shear Force Diagram (SFD)</h2>
  <div style="margin: 20px 0; text-align: center; background: white; padding: 10px; border: 1px solid #e5e7eb;">
    ${sfdSvg}
  </div>

  <h2>6. Bending Moment Diagram (BMD)</h2>
  <div style="margin: 20px 0; text-align: center; background: white; padding: 10px; border: 1px solid #e5e7eb; page-break-inside: avoid;">
    ${bmdSvg}
  </div>

  <h2>7. Critical Results</h2>
  <div class="critical-values">
    <h4>Shear Force (V)</h4>
    ${result.shearForce.maxAbsolute ? formatCP('Max Absolute', result.shearForce.maxAbsolute.value, result.shearForce.maxAbsolute.x, model.forceUnit, model.lengthUnit) : ''}
    ${result.shearForce.maxPositive ? formatCP('Max Positive', result.shearForce.maxPositive.value, result.shearForce.maxPositive.x, model.forceUnit, model.lengthUnit) : ''}
    ${result.shearForce.maxNegative ? formatCP('Max Negative', result.shearForce.maxNegative.value, result.shearForce.maxNegative.x, model.forceUnit, model.lengthUnit) : ''}

    <h4 style="margin-top: 15px;">Bending Moment (M)</h4>
    ${result.bendingMoment.maxAbsolute ? formatCP('Max Absolute', result.bendingMoment.maxAbsolute.value, result.bendingMoment.maxAbsolute.x, model.momentUnit, model.lengthUnit) : ''}
    ${result.bendingMoment.maxPositive ? formatCP('Max Sagging (+)', result.bendingMoment.maxPositive.value, result.bendingMoment.maxPositive.x, model.momentUnit, model.lengthUnit) : ''}
    ${result.bendingMoment.maxNegative ? formatCP('Max Hogging (-)', result.bendingMoment.maxNegative.value, result.bendingMoment.maxNegative.x, model.momentUnit, model.lengthUnit) : ''}
  </div>

  <div class="page-break"></div>

  <h2>8. Shear Force Equations</h2>
  ${result.shearForce.segments.map(s => `
    <div class="math">
      <strong>For ${formatValue(s.startX)} &le; x &le; ${formatValue(s.endX)} ${model.lengthUnit}:</strong><br/>
      V(x) = ${s.equation}
    </div>
  `).join('')}

  <h2>9. Bending Moment Equations</h2>
  ${result.bendingMoment.segments.map(s => `
    <div class="math">
      <strong>For ${formatValue(s.startX)} &le; x &le; ${formatValue(s.endX)} ${model.lengthUnit}:</strong><br/>
      M(x) = ${s.equation}
    </div>
  `).join('')}

  <div class="page-break"></div>

  <h2>10. Step-by-Step Calculations</h2>
  ${result.calculationSteps.map((step, idx) => `
    <div class="calculation-step">
      <h4>Step ${idx + 1}: ${step.title}</h4>
      <p>${step.description}</p>
      ${step.equations.map(eq => `<div class="math">${eq}</div>`).join('')}
      ${step.result ? `<p><strong>Result:</strong> ${step.result}</p>` : ''}
    </div>
  `).join('')}

  <div class="disclaimer">
    Results are intended for educational and preliminary analysis purposes and should be independently verified by a qualified engineer before use in construction or safety-critical applications.
  </div>
  
  <div class="footer">
    Generated by BEAMLAB &bull; ${date} ${time}
  </div>
  
  <script>
    // Wait for everything to be ready before calling print, if desired.
    // In many cases, we can trigger print automatically if opened in a new tab:
    // window.onload = () => window.print();
  </script>
</body>
</html>
  `;

  return html.trim();
}

/**
 * Opens the generated HTML report in a new browser window/tab and prompts for printing.
 */
export function openReportInWindow(html: string): void {
  const newWindow = window.open('', '_blank');
  if (newWindow) {
    // Copy styles from the current document so SVGs and other elements render correctly
    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map(node => node.outerHTML)
      .join('\n');
    const htmlWithStyles = html.replace('</head>', `\n${styles}\n</head>`);

    newWindow.document.open();
    newWindow.document.write(htmlWithStyles);
    newWindow.document.close();
    
    // Add an event listener to trigger print once loaded
    newWindow.onload = () => {
      // Optional slight delay to ensure fonts/layout are ready
      setTimeout(() => {
        newWindow.print();
      }, 500);
    };
  } else {
    console.error('Failed to open report in new window. Pop-ups might be blocked.');
  }
}
