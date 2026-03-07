import React, { useMemo, useRef, useImperativeHandle, forwardRef } from 'react';
import * as d3 from 'd3';
import { toPng } from 'html-to-image';
import { Download } from 'lucide-react';
import { Signal } from '../types';
import { parseWave } from '../lib/waveParser';

interface TimingChartRendererProps {
  signals: (Signal | {})[];
  widthScale?: number;
}

export interface TimingChartRef {
  exportSVG: () => void;
  exportPng: () => void;
}

const SLOT_WIDTH = 40;
const ROW_HEIGHT = 60;
const LABEL_WIDTH = 80;
const WAVE_HEIGHT = 30;
const PADDING = 20;

const SYSTEM_FONT_STACK = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

export const TimingChartRenderer = forwardRef<TimingChartRef, TimingChartRendererProps>(({ signals, widthScale = 1 }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const scaledSlotWidth = SLOT_WIDTH * widthScale;

  useImperativeHandle(ref, () => ({
    exportSVG: handleExportSVG,
    exportPng: handleExportPng
  }));

  const parsedSignals = useMemo(() => {
    return signals.map(s => {
      if ('name' in s) {
        return parseWave(s as Signal);
      }
      return null; // Spacer
    });
  }, [signals]);

  const maxDuration = useMemo(() => {
    return Math.max(...parsedSignals.map(s => {
      if (!s) return 0;
      return s.segments.reduce((acc, seg) => acc + seg.duration, 0);
    }), 0);
  }, [parsedSignals]);

  const width = LABEL_WIDTH + (maxDuration * scaledSlotWidth) + (PADDING * 2);
  const height = (signals.length * ROW_HEIGHT) + (PADDING * 2);

  const handleExportPng = async () => {
    if (containerRef.current) {
      try {
        const dataUrl = await toPng(containerRef.current, {
          backgroundColor: '#ffffff',
          width: width,
          height: height,
          style: {
            transform: 'none',
          }
        });
        const link = document.createElement('a');
        link.download = `timing-chart-${new Date().getTime()}.png`;
        link.href = dataUrl;
        link.click();
      } catch (err) {
        console.error('PNG export failed:', err);
      }
    }
  };

  const handleExportSVG = () => {
    if (containerRef.current) {
      const svgElement = containerRef.current.querySelector('svg');
      if (svgElement) {
        const svgData = new XMLSerializer().serializeToString(svgElement);
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const svgUrl = URL.createObjectURL(svgBlob);
        const downloadLink = document.createElement('a');
        downloadLink.href = svgUrl;
        downloadLink.download = `timing-chart-${new Date().getTime()}.svg`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        URL.revokeObjectURL(svgUrl);
      }
    }
  };

  const renderWave = (signal: any, rowIndex: number) => {
    if (!signal) return null;

    let currentX = LABEL_WIDTH + (signal.phaseShift || 0) * scaledSlotWidth;
    const yBase = PADDING + (rowIndex * ROW_HEIGHT) + (ROW_HEIGHT / 2);
    const yTop = yBase - (WAVE_HEIGHT / 2);
    const yBottom = yBase + (WAVE_HEIGHT / 2);
    const yMid = yBase;

    const paths: React.ReactNode[] = [];
    let dataIdx = 0;

    const CHART_TOP = PADDING;
    const CHART_BOTTOM = height - PADDING;
    const slopeX = signal.hasSlope ? (scaledSlotWidth * (signal.slopeDuration || 0.1)) : 0;

    const getVerticalPos = (type: string) => {
      if (type === '1' || type === 'r' || type === 'H') return yTop;
      if (type === '0' || type === 'f' || type === 'L') return yBottom;
      return null;
    };

    signal.segments.forEach((seg: any, i: number) => {
      const prevSeg = signal.segments[i - 1];
      const nextSeg = signal.segments[i + 1];
      const segWidth = seg.duration * scaledSlotWidth;
      
      // Background for data buses (0-9 and =)
      if (/[0-9=]/.test(seg.type)) {
        const colors = [
          '#ffffff', // 0: White
          '#E3F2FD', // 1: Light Blue
          '#F1F8E9', // 2: Light Green
          '#FFF3E0', // 3: Light Orange
          '#F3E5F5', // 4: Light Purple
          '#E0F2F1', // 5: Light Teal
          '#FFFDE7', // 6: Light Yellow
          '#FBE9E7', // 7: Light Deep Orange
          '#EFEBE9', // 8: Light Brown
          '#ECEFF1'  // 9: Light Blue Grey
        ];
        const color = colors[parseInt(seg.type)] || (seg.type === '=' ? '#ffffff' : '#ffffff');
        
        const busPath = signal.hasSlope 
          ? `M ${currentX} ${yMid} L ${currentX + slopeX/2} ${yTop} L ${currentX + segWidth - slopeX/2} ${yTop} L ${currentX + segWidth} ${yMid} L ${currentX + segWidth - slopeX/2} ${yBottom} L ${currentX + slopeX/2} ${yBottom} Z`
          : `M ${currentX} ${yTop} L ${currentX + segWidth} ${yTop} L ${currentX + segWidth} ${yBottom} L ${currentX} ${yBottom} Z`;

        paths.push(
          <g key={`data-bg-${rowIndex}-${i}`}>
            <path
              d={busPath}
              fill={color}
              stroke="#141414"
              strokeWidth="1"
            />
            {signal.showLabels && signal.data[seg.dataIndex] !== undefined && (
              <text
                x={currentX + segWidth / 2}
                y={yBase}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="12"
                style={{ fontFamily: SYSTEM_FONT_STACK }}
              >
                {signal.data[seg.dataIndex]}
              </text>
            )}
          </g>
        );
      } else if (seg.type === 'x') {
        // Hatched background
        const xPath = signal.hasSlope
          ? `M ${currentX} ${yMid} L ${currentX + slopeX/2} ${yTop} L ${currentX + segWidth - slopeX/2} ${yTop} L ${currentX + segWidth} ${yMid} L ${currentX + segWidth - slopeX/2} ${yBottom} L ${currentX + slopeX/2} ${yBottom} Z`
          : `M ${currentX} ${yTop} L ${currentX + segWidth} ${yTop} L ${currentX + segWidth} ${yBottom} L ${currentX} ${yBottom} Z`;

        paths.push(
          <g key={`x-bg-${rowIndex}-${i}`}>
             <defs>
              <pattern id="hatch" patternUnits="userSpaceOnUse" width="4" height="4">
                <path d="M-1,1 l2,-2 M0,4 l4,-4 M3,5 l2,-2" stroke="#141414" strokeWidth="0.5" opacity="0.3" />
              </pattern>
            </defs>
            <path
              d={xPath}
              fill="url(#hatch)"
              stroke="#141414"
              strokeWidth="1"
            />
          </g>
        );
      } else if (seg.type === '0' || seg.type === '1' || seg.type === 'r' || seg.type === 'f' || seg.type === 'H' || seg.type === 'L') {
        const y = (seg.type === '1' || seg.type === 'r' || seg.type === 'H') ? yTop : yBottom;
        let startX = currentX;
        let endX = currentX + segWidth;

        if (signal.hasSlope) {
          if (prevSeg && prevSeg.type !== 'gap' && getVerticalPos(prevSeg.type) !== getVerticalPos(seg.type)) {
            startX += slopeX / 2;
          }
          if (nextSeg && nextSeg.type !== 'gap' && getVerticalPos(nextSeg.type) !== getVerticalPos(seg.type)) {
            endX -= slopeX / 2;
          }
        }

        const levelLines = [
          <line
            key={`level-${rowIndex}-${i}`}
            x1={startX} y1={y}
            x2={endX} y2={y}
            stroke="#141414"
            strokeWidth="1.5"
          />
        ];

        // Short dashed lines for 'r' and 'f'
        if (seg.type === 'r' || seg.type === 'f') {
          levelLines.push(
            <line
              key={`short-dash-${rowIndex}-${i}`}
              x1={currentX} y1={yTop - 5}
              x2={currentX} y2={yBottom + 5}
              stroke="#3b82f6"
              strokeWidth="1"
              strokeDasharray="2,2"
              opacity="0.6"
            />
          );
        }

        paths.push(<g key={`level-group-${rowIndex}-${i}`}>{levelLines}</g>);
      }
 else if (['p', 'n', 'd', 'P', 'N', 'D'].includes(seg.type)) {
        // Clock / Pulse
        const halfWidth = segWidth / 2;
        const fallingEdgeX = currentX + halfWidth;
        const risingEdgeX = currentX;
        
        let clockPath = "";
        if (signal.hasSlope) {
          clockPath = `M ${currentX - slopeX/2} ${yBottom} L ${currentX + slopeX/2} ${yTop} L ${fallingEdgeX - slopeX/2} ${yTop} L ${fallingEdgeX + slopeX/2} ${yBottom} L ${currentX + segWidth - slopeX/2} ${yBottom}`;
        } else {
          clockPath = `M ${currentX} ${yBottom} L ${currentX} ${yTop} L ${fallingEdgeX} ${yTop} L ${fallingEdgeX} ${yBottom} L ${currentX + segWidth} ${yBottom}`;
        }
        
        const dashedLines = [];
        // Only lowercase p, n, d show dashed lines when showGrid is true
        if (signal.showGrid && ['p', 'n', 'd'].includes(seg.type)) {
            if (seg.type === 'n' || seg.type === 'd') {
                dashedLines.push(
                    <line 
                        key={`dashed-f-${rowIndex}-${i}`}
                        x1={fallingEdgeX} y1={CHART_TOP}
                        x2={fallingEdgeX} y2={CHART_BOTTOM}
                        stroke="#3b82f6"
                        strokeWidth="1"
                        strokeDasharray="2,2"
                        opacity="0.5"
                    />
                );
            }
            if (seg.type === 'p' || seg.type === 'd') {
                dashedLines.push(
                    <line 
                        key={`dashed-r-${rowIndex}-${i}`}
                        x1={risingEdgeX} y1={CHART_TOP}
                        x2={risingEdgeX} y2={CHART_BOTTOM}
                        stroke="#3b82f6"
                        strokeWidth="1"
                        strokeDasharray="2,2"
                        opacity="0.5"
                    />
                );
            }
        }
        
        paths.push(
          <g key={`clk-group-${rowIndex}-${i}`}>
            <path
              d={clockPath}
              fill="none"
              stroke="#141414"
              strokeWidth="1.5"
            />
            {dashedLines}
          </g>
        );
      }
 else if (seg.type === 'gap') {
        paths.push(
          <g key={`gap-${rowIndex}-${i}`}>
            <path
              d={`M ${currentX - 2} ${yTop - 5} L ${currentX + 2} ${yBottom + 5} M ${currentX + 3} ${yTop - 5} L ${currentX + 7} ${yBottom + 5}`}
              stroke="#141414"
              strokeWidth="1.5"
              fill="none"
            />
            <rect x={currentX - 5} y={yTop - 10} width="15" height={WAVE_HEIGHT + 20} fill="white" opacity="0.8" />
             <path
              d={`M ${currentX - 2} ${yTop - 5} L ${currentX + 2} ${yBottom + 5} M ${currentX + 3} ${yTop - 5} L ${currentX + 7} ${yBottom + 5}`}
              stroke="#141414"
              strokeWidth="1.5"
              fill="none"
            />
          </g>
        );
      }

      // Vertical transitions
      if (nextSeg && nextSeg.type !== 'gap' && seg.type !== 'gap') {
        const nextY = getVerticalPos(nextSeg.type);
        const currY = getVerticalPos(seg.type);
        
        if (currY !== null && nextY !== null && currY !== nextY) {
           if (signal.hasSlope) {
              paths.push(
                <line
                  key={`trans-${rowIndex}-${i}`}
                  x1={currentX + segWidth - slopeX / 2} y1={currY}
                  x2={currentX + segWidth + slopeX / 2} y2={nextY}
                  stroke="#141414"
                  strokeWidth="1.5"
                />
              );
           } else {
              paths.push(
                <line
                  key={`trans-${rowIndex}-${i}`}
                  x1={currentX + segWidth} y1={currY}
                  x2={currentX + segWidth} y2={nextY}
                  stroke="#141414"
                  strokeWidth="1.5"
                />
              );
           }
        }
      }

      currentX += segWidth;
    });

    return (
      <g key={`row-${rowIndex}`}>
        <text
          x={PADDING}
          y={yBase}
          dominantBaseline="middle"
          fontSize="14"
          fontWeight="500"
          fill="#3b82f6"
          style={{ fontFamily: SYSTEM_FONT_STACK }}
        >
          {signal.name}
        </text>
        {paths}
      </g>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <button
          onClick={handleExportSVG}
          className="flex items-center gap-2 px-3 py-1.5 bg-white border border-zinc-200 text-zinc-900 text-xs font-bold rounded-lg hover:bg-zinc-50 transition-colors shadow-sm"
        >
          <Download className="w-3.5 h-3.5" />
          SVGとして保存
        </button>
        <button
          onClick={handleExportPng}
          className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 text-white text-xs font-bold rounded-lg hover:bg-zinc-800 transition-colors shadow-sm"
        >
          <Download className="w-3.5 h-3.5" />
          PNGとして保存
        </button>
      </div>
      <div className="overflow-auto bg-white border border-zinc-200 rounded-lg shadow-sm p-4">
        <div ref={containerRef} style={{ width: `${width}px`, height: `${height}px` }}>
          <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
            {signals.map((s, idx) => {
              if ('name' in s) {
                return renderWave(parsedSignals[idx], idx);
              }
              return null;
            })}
          </svg>
        </div>
      </div>
    </div>
  );
});
