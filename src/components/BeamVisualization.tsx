import React, { useRef, useState, useMemo, useCallback } from 'react';
import {
  BeamModel,
  SupportReaction,
  Support,
  PointLoad,
  DistributedLoad,
  AppliedMoment,
  Load
} from '../types/beam';
import './BeamVisualization.css';

interface BeamVisualizationProps {
  beam: BeamModel;
  reactions?: SupportReaction[];
  selectedLoadId?: string;
  onLoadSelect?: (id: string) => void;
  onLoadPositionChange?: (id: string, newPosition: number) => void;
  onSupportPositionChange?: (id: string, newPosition: number) => void;
  showReactions?: boolean;
  showDimensions?: boolean;
  height?: number;
}

const VIEW_WIDTH = 1000;
const VIEW_HEIGHT = 350;
const MARGIN_LEFT = 100;
const MARGIN_RIGHT = 100;
const DRAW_WIDTH = VIEW_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;
const BEAM_Y = 200;
const BEAM_HEIGHT = 12;

export const BeamVisualization: React.FC<BeamVisualizationProps> = ({
  beam,
  reactions = [],
  selectedLoadId,
  onLoadSelect,
  onLoadPositionChange,
  onSupportPositionChange,
  showReactions = true,
  showDimensions = true,
  height = 350,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  
  const [draggingItem, setDraggingItem] = useState<{ id: string; type: 'load' | 'support' } | null>(null);

  const scaleX = useCallback((pos: number) => {
    if (beam.geometry.length === 0) return MARGIN_LEFT;
    return MARGIN_LEFT + (pos / beam.geometry.length) * DRAW_WIDTH;
  }, [beam.geometry.length]);

  const unscaleX = useCallback((x: number) => {
    if (beam.geometry.length === 0) return 0;
    const pos = ((x - MARGIN_LEFT) / DRAW_WIDTH) * beam.geometry.length;
    return Math.max(0, Math.min(pos, beam.geometry.length));
  }, [beam.geometry.length]);

  const handlePointerDown = (e: React.PointerEvent, id: string, type: 'load' | 'support') => {
    e.stopPropagation();
    if (type === 'load' && onLoadSelect) {
      onLoadSelect(id);
    }
    setDraggingItem({ id, type });
    if (svgRef.current) {
      svgRef.current.setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draggingItem || !svgRef.current) return;
    
    const svgRect = svgRef.current.getBoundingClientRect();
    const viewBoxRatio = VIEW_WIDTH / svgRect.width;
    const svgX = (e.clientX - svgRect.left) * viewBoxRatio;
    const newPos = unscaleX(svgX);

    if (draggingItem.type === 'load' && onLoadPositionChange) {
      onLoadPositionChange(draggingItem.id, newPos);
    } else if (draggingItem.type === 'support' && onSupportPositionChange) {
      onSupportPositionChange(draggingItem.id, newPos);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (draggingItem && svgRef.current) {
      svgRef.current.releasePointerCapture(e.pointerId);
    }
    setDraggingItem(null);
  };

  const renderSupport = (support: Support) => {
    const x = scaleX(support.position);
    const size = 20;

    let shape = null;
    if (support.type === 'pin') {
      shape = (
        <polygon 
          points={`${x},${BEAM_Y + BEAM_HEIGHT/2} ${x - size/2},${BEAM_Y + BEAM_HEIGHT/2 + size} ${x + size/2},${BEAM_Y + BEAM_HEIGHT/2 + size}`}
          className="support-shape"
        />
      );
    } else if (support.type === 'roller') {
      shape = (
        <g>
          <polygon 
            points={`${x},${BEAM_Y + BEAM_HEIGHT/2} ${x - size/2},${BEAM_Y + BEAM_HEIGHT/2 + size - 6} ${x + size/2},${BEAM_Y + BEAM_HEIGHT/2 + size - 6}`}
            className="support-shape"
          />
          <circle cx={x - 6} cy={BEAM_Y + BEAM_HEIGHT/2 + size - 3} r={3} className="support-roller-circle" />
          <circle cx={x + 6} cy={BEAM_Y + BEAM_HEIGHT/2 + size - 3} r={3} className="support-roller-circle" />
          <line x1={x - size} y1={BEAM_Y + BEAM_HEIGHT/2 + size} x2={x + size} y2={BEAM_Y + BEAM_HEIGHT/2 + size} className="support-fixed-hatch" />
        </g>
      );
    } else if (support.type === 'fixed') {
      const isRight = support.position > beam.geometry.length / 2;
      const w = 8;
      const h = 40;
      const yStart = BEAM_Y + BEAM_HEIGHT/2 - h/2;
      shape = (
        <g>
          <rect 
            x={isRight ? x : x - w} 
            y={yStart} 
            width={w} 
            height={h} 
            className="support-shape" 
          />
          {Array.from({ length: 6 }).map((_, i) => (
            <line 
              key={i}
              x1={isRight ? x + w : x - w}
              y1={yStart + i * 8}
              x2={isRight ? x + w + 8 : x - w - 8}
              y2={yStart + i * 8 + 8}
              className="support-fixed-hatch"
            />
          ))}
        </g>
      );
    }

    return (
      <g 
        key={support.id} 
        className="support-group"
        onPointerDown={(e) => handlePointerDown(e, support.id, 'support')}
      >
        {shape}
      </g>
    );
  };

  const renderPointLoad = (load: PointLoad) => {
    const x = scaleX(load.position);
    const arrowLen = 50;
    const isUp = load.direction === 'up';
    
    const yStart = isUp ? BEAM_Y + BEAM_HEIGHT/2 + arrowLen + 10 : BEAM_Y - BEAM_HEIGHT/2 - arrowLen - 10;
    const yEnd = isUp ? BEAM_Y + BEAM_HEIGHT/2 + 5 : BEAM_Y - BEAM_HEIGHT/2 - 5;
    
    const headDir = isUp ? -1 : 1;
    const headSize = 8;

    return (
      <g 
        key={load.id} 
        className={`load-group ${selectedLoadId === load.id ? 'selected' : ''}`}
        onPointerDown={(e) => handlePointerDown(e, load.id, 'load')}
      >
        <line x1={x} y1={yStart} x2={x} y2={yEnd} className="load-arrow" />
        <polygon 
          points={`${x},${yEnd} ${x - headSize},${yEnd - headDir * headSize * 1.5} ${x + headSize},${yEnd - headDir * headSize * 1.5}`}
          className="load-arrow-head"
        />
        <text x={x} y={isUp ? yStart + 15 : yStart - 10} className="load-text">
          {load.magnitude} {beam.forceUnit} @ {load.position}{beam.lengthUnit}
        </text>
      </g>
    );
  };

  const renderDistributedLoad = (load: DistributedLoad) => {
    const xStart = scaleX(load.startPosition);
    const xEnd = scaleX(load.endPosition);
    const width = xEnd - xStart;
    
    if (width <= 0) return null;

    const isUp = load.direction === 'up';
    
    // Scale magnitudes to visual heights (min 20, max 60)
    const maxMag = Math.max(Math.abs(load.startMagnitude), Math.abs(load.endMagnitude), 0.1);
    const hStart = 20 + (Math.abs(load.startMagnitude) / maxMag) * 40;
    const hEnd = 20 + (Math.abs(load.endMagnitude) / maxMag) * 40;

    const yStartVal = isUp ? BEAM_Y + BEAM_HEIGHT/2 + 5 : BEAM_Y - BEAM_HEIGHT/2 - 5;
    const yTopStart = isUp ? yStartVal + hStart : yStartVal - hStart;
    const yTopEnd = isUp ? yStartVal + hEnd : yStartVal - hEnd;

    const numArrows = Math.max(3, Math.floor(width / 20));
    const headDir = isUp ? -1 : 1;
    const headSize = 6;

    const arrows = [];
    for (let i = 0; i <= numArrows; i++) {
      const t = i / numArrows;
      const x = xStart + t * width;
      const yTop = yTopStart + t * (yTopEnd - yTopStart);
      
      arrows.push(
        <g key={i}>
          <line x1={x} y1={yTop} x2={x} y2={yStartVal} className="load-arrow" strokeWidth={1} />
          <polygon 
            points={`${x},${yStartVal} ${x - headSize},${yStartVal - headDir * headSize * 1.5} ${x + headSize},${yStartVal - headDir * headSize * 1.5}`}
            className="load-arrow-head"
          />
        </g>
      );
    }

    return (
      <g 
        key={load.id} 
        className={`load-group ${selectedLoadId === load.id ? 'selected' : ''}`}
        onPointerDown={(e) => handlePointerDown(e, load.id, 'load')}
      >
        <polygon 
          points={`${xStart},${yStartVal} ${xEnd},${yStartVal} ${xEnd},${yTopEnd} ${xStart},${yTopStart}`}
          className="load-dist-fill"
        />
        <line x1={xStart} y1={yTopStart} x2={xEnd} y2={yTopEnd} className="load-dist-line" />
        {arrows}
        <text x={xStart + width/2} y={isUp ? Math.max(yTopStart, yTopEnd) + 20 : Math.min(yTopStart, yTopEnd) - 10} className="load-text">
          {load.startMagnitude !== load.endMagnitude 
            ? `${load.startMagnitude} - ${load.endMagnitude}`
            : load.startMagnitude} {beam.distLoadUnit} @ {load.startPosition}-{load.endPosition}{beam.lengthUnit}
        </text>
      </g>
    );
  };

  const renderAppliedMoment = (load: AppliedMoment) => {
    const x = scaleX(load.position);
    const r = 25;
    const isCW = load.direction === 'clockwise';
    
    // Draw an arc
    const startX = x - r;
    const startY = BEAM_Y - r;
    const endX = x + r;
    const endY = BEAM_Y - r;
    
    const path = isCW 
      ? `M ${startX} ${BEAM_Y} A ${r} ${r} 0 1 1 ${x} ${BEAM_Y + r}`
      : `M ${endX} ${BEAM_Y} A ${r} ${r} 0 1 0 ${x} ${BEAM_Y + r}`;

    // Arrowhead position and rotation
    const arrowX = x;
    const arrowY = BEAM_Y + r;
    const arrowRot = isCW ? 180 : 0;
    const headSize = 8;

    return (
      <g 
        key={load.id} 
        className={`load-group ${selectedLoadId === load.id ? 'selected' : ''}`}
        onPointerDown={(e) => handlePointerDown(e, load.id, 'load')}
      >
        <path d={path} className="moment-path" />
        <polygon 
          points={`${arrowX},${arrowY} ${arrowX - headSize},${arrowY - headSize} ${arrowX + headSize},${arrowY - headSize}`}
          className="load-arrow-head"
          transform={`rotate(${arrowRot} ${arrowX} ${arrowY})`}
        />
        <text x={x} y={BEAM_Y - r - 15} className="load-text">
          {load.magnitude} {beam.momentUnit} @ {load.position}{beam.lengthUnit}
        </text>
      </g>
    );
  };

  const supportNames = useMemo(() => {
    const sorted = [...beam.supports].sort((a, b) => a.position - b.position);
    const names: Record<string, string> = {};
    sorted.forEach((s, i) => {
      names[s.id] = String.fromCharCode(65 + i);
    });
    return names;
  }, [beam.supports]);

  const renderReaction = (reaction: SupportReaction, index: number) => {
    const x = scaleX(reaction.position);
    const elements = [];
    const supName = supportNames[reaction.supportId] || '?';
    
    // Vertical Reaction
    if (Math.abs(reaction.verticalForce) > 0.01) {
      const isUp = reaction.verticalForce > 0;
      const arrowLen = 40;
      const yStart = isUp ? BEAM_Y + BEAM_HEIGHT/2 + arrowLen + 30 : BEAM_Y - BEAM_HEIGHT/2 - arrowLen - 30;
      const yEnd = isUp ? BEAM_Y + BEAM_HEIGHT/2 + 20 : BEAM_Y - BEAM_HEIGHT/2 - 20;
      const headDir = isUp ? -1 : 1;
      const headSize = 8;
      
      elements.push(
        <g key={`vy-${index}`}>
          <line x1={x} y1={yStart} x2={x} y2={yEnd} className="reaction-arrow" strokeDasharray="4 2" />
          <polygon 
            points={`${x},${yEnd} ${x - headSize},${yEnd - headDir * headSize * 1.5} ${x + headSize},${yEnd - headDir * headSize * 1.5}`}
            className="reaction-arrow-head"
          />
          <text x={x + 15} y={isUp ? yStart - 10 : yStart + 20} className="reaction-text" textAnchor="start">
            R_{supName} = {reaction.verticalForce > 0 ? '+' : ''}{reaction.verticalForce.toFixed(2)} {beam.forceUnit} {isUp ? '↑' : '↓'}
          </text>
        </g>
      );
    }
    
    // Horizontal Reaction
    if (Math.abs(reaction.horizontalForce) > 0.01) {
      const isRight = reaction.horizontalForce > 0;
      const arrowLen = 40;
      const xStart = isRight ? x - arrowLen - 20 : x + arrowLen + 20;
      const xEnd = isRight ? x - 20 : x + 20;
      const headDir = isRight ? -1 : 1; 
      const headSize = 8;
      const y = BEAM_Y;
      
      elements.push(
        <g key={`hx-${index}`}>
          <line x1={xStart} y1={y} x2={xEnd} y2={y} className="reaction-arrow" strokeDasharray="4 2" />
          <polygon 
            points={`${xEnd},${y} ${xEnd - headDir * headSize * 1.5},${y - headSize} ${xEnd - headDir * headSize * 1.5},${y + headSize}`}
            className="reaction-arrow-head"
          />
          <text x={isRight ? xStart - 5 : xStart + 5} y={y + 4} className="reaction-text" textAnchor={isRight ? 'end' : 'start'}>
            {supName}x = {reaction.horizontalForce > 0 ? '+' : ''}{reaction.horizontalForce.toFixed(2)} {beam.forceUnit} {isRight ? '→' : '←'}
          </text>
        </g>
      );
    }
    
    // Moment Reaction
    if (Math.abs(reaction.moment) > 0.01) {
      const isCCW = reaction.moment > 0;
      const r = 35;
      const path = isCCW 
        ? `M ${x+r} ${BEAM_Y} A ${r} ${r} 0 0 0 ${x} ${BEAM_Y-r}`
        : `M ${x-r} ${BEAM_Y} A ${r} ${r} 0 0 1 ${x} ${BEAM_Y-r}`;
      
      elements.push(
        <g key={`m-${index}`}>
          <path d={path} className="reaction-moment-path" strokeDasharray="4 2" />
          <text x={x} y={BEAM_Y - r - 10} className="reaction-text">
            M_{supName} = {reaction.moment > 0 ? '+' : ''}{reaction.moment.toFixed(2)} {beam.momentUnit} {isCCW ? '↺' : '↻'}
          </text>
        </g>
      );
    }
    
    return <g key={`reaction-${index}`}>{elements}</g>;
  };

  const renderDimensions = () => {
    if (!showDimensions || beam.geometry.length <= 0) return null;

    // Collect all critical points
    const points: number[] = [0, beam.geometry.length];
    beam.supports.forEach(s => points.push(s.position));
    beam.loads.forEach(l => {
      if (l.type === 'point' || l.type === 'moment') points.push(l.position);
      if (l.type === 'distributed') {
        points.push(l.startPosition);
        points.push(l.endPosition);
      }
    });

    // Sort and unique
    const uniquePoints = Array.from(new Set(points)).sort((a, b) => a - b);
    const criticalXs = uniquePoints.filter((val, i, arr) => i === 0 || (val - arr[i-1] > 1e-4));

    const dimY = BEAM_Y + 70;
    const elements = [];

    // Draw main horizontal line
    elements.push(
      <line 
        key="main-dim-line"
        x1={MARGIN_LEFT} 
        y1={dimY} 
        x2={MARGIN_LEFT + DRAW_WIDTH} 
        y2={dimY} 
        className="dimension-line" 
      />
    );

    // Draw ticks
    criticalXs.forEach((val, i) => {
      const x = scaleX(val);
      elements.push(
        <line 
          key={`tick-${i}`}
          x1={x} y1={dimY - 5} x2={x} y2={dimY + 5} 
          className="dimension-tick" 
        />
      );
    });

    // Draw gap text
    for (let i = 0; i < criticalXs.length - 1; i++) {
      const xStart = scaleX(criticalXs[i]);
      const xEnd = scaleX(criticalXs[i+1]);
      const midX = (xStart + xEnd) / 2;
      const gapVal = criticalXs[i+1] - criticalXs[i];
      
      // Alternate Y position if gap is small
      const textY = (xEnd - xStart < 40 && i % 2 !== 0) ? dimY + 15 : dimY - 5;
      
      elements.push(
        <text 
          key={`gap-${i}`}
          x={midX} y={textY} 
          className="dimension-text"
        >
          {gapVal.toFixed(2)} {beam.lengthUnit}
        </text>
      );
    }

    // Add overall L dimension below
    const L_Y = dimY + 35;
    elements.push(
      <g key="overall-L">
        <line x1={MARGIN_LEFT} y1={L_Y} x2={MARGIN_LEFT + DRAW_WIDTH} y2={L_Y} className="dimension-line" />
        <line x1={MARGIN_LEFT} y1={L_Y - 5} x2={MARGIN_LEFT} y2={L_Y + 5} className="dimension-tick" />
        <line x1={MARGIN_LEFT + DRAW_WIDTH} y1={L_Y - 5} x2={MARGIN_LEFT + DRAW_WIDTH} y2={L_Y + 5} className="dimension-tick" />
        <text x={MARGIN_LEFT + DRAW_WIDTH / 2} y={L_Y - 5} className="dimension-text" style={{ fontWeight: 'bold' }}>
          Total L = {beam.geometry.length} {beam.lengthUnit}
        </text>
      </g>
    );

    return <g>{elements}</g>;
  };

  return (
    <div className="beam-visualization-container" style={{ height }}>
      <svg 
        id="beam-viz-svg"
        ref={svgRef}
        viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`} 
        className="beam-svg"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {/* Defs for gradients/patterns if needed */}
        <defs>
          <pattern id="hatch" patternUnits="userSpaceOnUse" width="4" height="4">
            <path d="M-1,1 l2,-2 M0,4 l4,-4 M3,5 l2,-2" stroke="var(--color-primary, #6c757d)" strokeWidth="1" />
          </pattern>
        </defs>

        {/* Dimensions and Gaps */}
        {renderDimensions()}

        {/* Beam Rectangle */}
        <rect 
          x={MARGIN_LEFT} 
          y={BEAM_Y - BEAM_HEIGHT / 2} 
          width={DRAW_WIDTH} 
          height={BEAM_HEIGHT} 
          rx={2} 
          className="beam-rect" 
        />



        {/* Supports */}
        {beam.supports.map(renderSupport)}

        {/* Loads */}
        {beam.loads.map(load => {
          if (load.type === 'point') return renderPointLoad(load);
          if (load.type === 'distributed') return renderDistributedLoad(load);
          if (load.type === 'moment') return renderAppliedMoment(load);
          return null;
        })}

        {/* Reactions */}
        {showReactions && reactions.map((reaction, i) => renderReaction(reaction, i))}
        
      </svg>
    </div>
  );
};
