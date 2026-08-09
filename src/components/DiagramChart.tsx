import React, { useRef, useState, useMemo, useEffect, MouseEvent } from 'react';
import { DiagramPoint, CriticalPoint } from '../types/beam';
import './DiagramChart.css';

interface DiagramChartProps {
  title: string;
  data: DiagramPoint[];
  criticalPoints?: CriticalPoint[];
  xLabel: string;
  yLabel: string;
  xUnit: string;
  yUnit: string;
  positiveColor?: string;
  negativeColor?: string;
  height?: number;
  showGrid?: boolean;
  beamLength: number;
  invertY?: boolean; // for BMD convention where sagging is drawn below
  svgId?: string;
}

export const DiagramChart: React.FC<DiagramChartProps> = ({
  title,
  data,
  criticalPoints = [],
  xLabel,
  yLabel,
  xUnit,
  yUnit,
  positiveColor = 'var(--color-primary, #3b82f6)',
  negativeColor = 'var(--color-danger, #ef4444)',
  height = 300,
  showGrid = true,
  beamLength,
  invertY = false,
  svgId
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  
  // Hover state
  const [hoverData, setHoverData] = useState<{
    x: number;
    y: number;
    beamX: number;
    val: number;
    visible: boolean;
  }>({ x: 0, y: 0, beamX: 0, val: 0, visible: false });

  // Animation state
  const [isAnimated, setIsAnimated] = useState(false);
  useEffect(() => {
    // Small delay to ensure CSS classes apply for animation
    const timer = setTimeout(() => setIsAnimated(true), 50);
    return () => clearTimeout(timer);
  }, []);

  // Dimensions & Margins
  const margin = { top: 40, right: 40, bottom: 50, left: 80 };
  const width = 800; // Intrinsic width, will scale via viewBox
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  // Scales
  const xMax = Math.max(beamLength, ...data.map(d => d.x));
  
  const yValues = data.map(d => d.value);
  let yMinRaw = Math.min(0, ...yValues);
  let yMaxRaw = Math.max(0, ...yValues);
  
  // Add padding to Y axis
  const yRange = yMaxRaw - yMinRaw;
  const yPadding = yRange === 0 ? 10 : yRange * 0.15;
  const yMin = yMinRaw - yPadding;
  const yMax = yMaxRaw + yPadding;

  const getScaleX = (x: number) => (x / xMax) * innerWidth;
  const getScaleY = (y: number) => {
    const yScaled = ((y - yMin) / (yMax - yMin)) * innerHeight;
    // SVG y=0 is at the top. 
    // If invertY is false, positive y should go up (so subtract from innerHeight).
    // If invertY is true, positive y should go down.
    return invertY ? yScaled : innerHeight - yScaled;
  };

  const zeroY = getScaleY(0);

  // Generate paths
  const generatePaths = () => {
    if (data.length === 0) return { linePath: '', posPath: '', negPath: '' };
    
    let linePath = `M ${getScaleX(data[0].x)} ${getScaleY(data[0].value)}`;
    let posPath = `M ${getScaleX(data[0].x)} ${zeroY}`;
    let negPath = `M ${getScaleX(data[0].x)} ${zeroY}`;

    for (let i = 0; i < data.length; i++) {
      const pt = data[i];
      const cx = getScaleX(pt.x);
      const cy = getScaleY(pt.value);
      
      linePath += ` L ${cx} ${cy}`;
      
      // We do a simple trick for fills: just use the line path and close it to the zero line.
      // A more robust way is clipping, which we'll use below.
    }

    return { linePath };
  };

  const { linePath } = useMemo(() => generatePaths(), [data, invertY, innerWidth, innerHeight]);

  // Generate grid
  const xTicks = useMemo(() => {
    const ticks = [];
    const count = 10;
    for (let i = 0; i <= count; i++) {
      ticks.push((xMax / count) * i);
    }
    return ticks;
  }, [xMax]);

  const yTicks = useMemo(() => {
    const ticks = [];
    const count = 6;
    for (let i = 0; i <= count; i++) {
      ticks.push(yMin + ((yMax - yMin) / count) * i);
    }
    return ticks;
  }, [yMin, yMax]);

  // Handlers
  const handleMouseMove = (e: MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const xClient = e.clientX - rect.left;
    const yClient = e.clientY - rect.top;
    
    // Scale client back to viewBox
    const scaleFactor = width / rect.width;
    const xView = xClient * scaleFactor;
    const yView = yClient * scaleFactor;

    const xInner = xView - margin.left;
    if (xInner >= 0 && xInner <= innerWidth) {
      const beamX = (xInner / innerWidth) * xMax;
      
      // Interpolate value
      let val = 0;
      for (let i = 0; i < data.length - 1; i++) {
        const p1 = data[i];
        const p2 = data[i+1];
        if (beamX >= p1.x && beamX <= p2.x) {
          // Handle discontinuities (same X)
          if (p1.x === p2.x) {
            val = p2.value; // Arbitrary choice for jump
          } else {
            const t = (beamX - p1.x) / (p2.x - p1.x);
            val = p1.value + t * (p2.value - p1.value);
          }
          break;
        }
      }

      setHoverData({
        x: xInner + margin.left, // relative to SVG wrapper
        y: yClient,              // relative to screen for tooltip top pos
        beamX,
        val,
        visible: true
      });
    } else {
      setHoverData(prev => ({ ...prev, visible: false }));
    }
  };

  const handleMouseLeave = () => {
    setHoverData(prev => ({ ...prev, visible: false }));
  };

  // Formatter for values
  const formatVal = (v: number) => {
    const sign = v > 0 ? '+' : '';
    return `${sign}${v.toFixed(2)}`;
  };

  // Define SVG path length for animation (approximate or just use pathLength="1")
  return (
    <div className="diagramChartContainer">
      <div className="chartHeader">
        <h3 className="chartTitle">{title}</h3>
      </div>
      
      <div className="chartSvgWrapper">
        <svg
          id={svgId}
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          className="chartSvg"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          {/* Defs for clipping and masks */}
          <defs>
            <clipPath id="pos-clip">
              <rect 
                x={0} 
                y={invertY ? zeroY : 0} 
                width={innerWidth} 
                height={invertY ? innerHeight - zeroY : zeroY} 
              />
            </clipPath>
            <clipPath id="neg-clip">
              <rect 
                x={0} 
                y={invertY ? 0 : zeroY} 
                width={innerWidth} 
                height={invertY ? zeroY : innerHeight - zeroY} 
              />
            </clipPath>
          </defs>

          <g transform={`translate(${margin.left},${margin.top})`}>
            {/* Grid */}
            {showGrid && yTicks.map((tick, i) => (
              <line key={`y-${i}`} x1={0} y1={getScaleY(tick)} x2={innerWidth} y2={getScaleY(tick)} className="gridLine" />
            ))}
            {showGrid && xTicks.map((tick, i) => (
              <line key={`x-${i}`} x1={getScaleX(tick)} y1={0} x2={getScaleX(tick)} y2={innerHeight} className="gridLine" />
            ))}

            {/* Zero Line */}
            <line x1={0} y1={zeroY} x2={innerWidth} y2={zeroY} className="zeroLine" />

            {/* Fills */}
            <path
              d={`${linePath} L ${innerWidth} ${zeroY} L 0 ${zeroY} Z`}
              fill={positiveColor}
              clipPath="url(#pos-clip)"
              className={`fillAreaPositive ${isAnimated ? 'fillAnimation' : ''}`}
            />
            <path
              d={`${linePath} L ${innerWidth} ${zeroY} L 0 ${zeroY} Z`}
              fill={negativeColor}
              clipPath="url(#neg-clip)"
              className={`fillAreaNegative ${isAnimated ? 'fillAnimation' : ''}`}
            />

            {/* Line Path */}
            <path
              d={linePath}
              stroke={positiveColor} // fallback
              strokeWidth={2.5}
              fill="none"
              className={isAnimated ? 'drawAnimation' : ''}
              pathLength="1"
              strokeDasharray="1"
              strokeDashoffset={isAnimated ? 0 : 1}
              style={{
                stroke: 'var(--text-primary, #333)' // Main line color
              }}
            />

            {/* Axes */}
            {/* X-axis */}
            <line x1={0} y1={innerHeight} x2={innerWidth} y2={innerHeight} className="axisLine" />
            {xTicks.map((tick, i) => (
              <g key={`xtick-${i}`} transform={`translate(${getScaleX(tick)}, ${innerHeight})`}>
                <line x1={0} y1={0} x2={0} y2={6} className="axisTick" />
                <text x={0} y={20} textAnchor="middle" className="axisLabel">{tick.toFixed(1)}</text>
              </g>
            ))}
            <text x={innerWidth / 2} y={innerHeight + 40} textAnchor="middle" className="axisTitle">
              {xLabel} ({xUnit})
            </text>

            {/* Y-axis */}
            <line x1={0} y1={0} x2={0} y2={innerHeight} className="axisLine" />
            {yTicks.map((tick, i) => (
              <g key={`ytick-${i}`} transform={`translate(0, ${getScaleY(tick)})`}>
                <line x1={-6} y1={0} x2={0} y2={0} className="axisTick" />
                <text x={-10} y={4} textAnchor="end" className="axisLabel">{tick.toFixed(1)}</text>
              </g>
            ))}
            <text 
              x={-innerHeight / 2} 
              y={-60} 
              textAnchor="middle" 
              transform="rotate(-90)" 
              className="axisTitle"
            >
              {yLabel} ({yUnit})
            </text>

            {/* Critical Points */}
            {criticalPoints.map((cp, i) => {
              const cx = getScaleX(cp.x);
              const cy = getScaleY(cp.value);
              const color = cp.value >= 0 ? positiveColor : negativeColor;
              
              // Shift label if it's too close to edges
              let textAnchor: "middle" | "start" | "end" = "middle";
              let textX = 0;
              if (cx < 40) {
                textAnchor = "start";
                textX = 10;
              } else if (cx > innerWidth - 40) {
                textAnchor = "end";
                textX = -10;
              }

              return (
                <g key={`cp-${i}`} transform={`translate(${cx}, ${cy})`}>
                  <circle r={5} fill={color} className="criticalPoint" />
                  <text 
                    x={textX} 
                    y={cp.value >= 0 ? -12 : 22} 
                    textAnchor={textAnchor}
                    fill={color}
                    className="criticalPointLabel"
                  >
                    {cp.label} {yUnit}
                  </text>
                </g>
              );
            })}

            {/* Hover Cursor Line */}
            {hoverData.visible && (
              <line 
                x1={hoverData.x - margin.left} 
                y1={0} 
                x2={hoverData.x - margin.left} 
                y2={innerHeight} 
                className="cursorLine" 
              />
            )}
          </g>
        </svg>

        {/* Hover Tooltip (HTML overlay) */}
        {hoverData.visible && (
          <div 
            className="tooltip"
            style={{ 
              left: `${(hoverData.x / width) * 100}%`,
              top: `${hoverData.y}px` 
            }}
          >
            <div>x = {hoverData.beamX.toFixed(2)} {xUnit}</div>
            <div className="tooltipValue">
              {title.includes('Shear') ? 'V' : 'M'} = {formatVal(hoverData.val)} {yUnit}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
