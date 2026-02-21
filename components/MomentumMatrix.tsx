'use client';

import React, { useMemo, useState } from 'react';

import { IndustryRow, IndustryApiResponse } from '@/types';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Label, ReferenceArea, LabelList, Cell } from 'recharts';
import { formatPercent, formatMoney, formatCompactNumber } from '@/lib/formatters';

interface Props {
  data: IndustryRow[];
  multiSnapshotData?: Record<string, IndustryApiResponse>;
  weighting: 'weighted' | 'equal';
  groupBy: 'industry' | 'sector' | 'ticker';
  yAxis?: 'week' | 'rsi';
}

const CustomTooltip = ({ active, payload, yAxis_ }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const isRSI = yAxis_ === 'rsi';
    return (
      <div className="bg-white/95 backdrop-blur-sm p-4 border border-blue-100 shadow-xl rounded-xl text-xs z-50">
        <p className="font-bold text-sm mb-2 text-gray-800">{data.name}</p>
        <div className="space-y-1.5">
          <p className="text-gray-500 flex justify-between gap-4">
            <span>Momentum:</span>
            <span className={`font-mono font-bold ${data.momentum >= 0 ? 'text-green-600' : 'text-red-500'}`}>
              {formatPercent(data.momentum)}
            </span>
          </p>
          <p className="text-gray-500 flex justify-between gap-4">
            <span>{isRSI ? 'RSI:' : 'Weekly Perf:'}</span>
            <span className={`font-mono font-bold ${data[isRSI ? 'rsi' : 'week'] >= (isRSI ? 50 : 0) ? 'text-blue-600' : 'text-gray-600'}`}>
              {isRSI ? data.rsi.toFixed(2) : formatPercent(data.week)}
            </span>
          </p>
          <p className="text-gray-500 flex justify-between gap-4 border-t border-gray-100 pt-1.5 mt-1.5">
            <span>Mkt Cap:</span>
            <span className="font-mono font-bold text-gray-700">
              {formatMoney(data.marketCap)}
            </span>
          </p>
          <p className="text-gray-400 text-[10px] mt-1 italic">
            {data.stockCount} companies {data.isHistorical && <span className="text-[#3D3DFF] font-semibold ml-1">• {data.dateLabel}</span>}
          </p>
        </div>
      </div>
    );
  }
  return null;
};

export default function MomentumMatrix({ data, multiSnapshotData, weighting, groupBy = 'industry', yAxis = 'week' }: Props) {
  // --- Zoom & Pan State ---
  const [zoomLevel, setZoomLevel] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 }); // offset in domain units

  // --- Mouse Drag State ---
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // --- Hover State ---
  const [hoveredName, setHoveredName] = useState<string | null>(null);

  // Filter out null/invalid data
  const chartData = data.filter(d =>
    d.momentum !== null &&
    d[yAxis] !== null &&
    !isNaN(d.momentum) &&
    !isNaN(d[yAxis] as number)
  );

  const isRSI = yAxis === 'rsi';

  // Process multi-snapshot data into trajectories
  const trajectories = useMemo(() => {
    if (!multiSnapshotData) return [];

    const snapshotIds = Object.keys(multiSnapshotData);
    if (snapshotIds.length <= 1) return [];

    // Map each name to its list of points across snapshots
    const trajectoryMap = new Map<string, any[]>();

    snapshotIds.forEach((id, snapshotIndex) => {
      const snapshot = multiSnapshotData[id];
      snapshot.data.forEach(item => {
        const itemData = {
          name: item.name,
          momentum: weighting === 'equal' ? item.momentumEqual : item.momentum,
          yValue: weighting === 'equal' ? (isRSI ? (item as any).rsiEqual : item.weekEqual) : (isRSI ? (item as any).rsi : item.week),
          snapshotIndex,
          // Extra payload data to prevent Tooltip crashing on historical points
          week: weighting === 'equal' ? item.weekEqual : item.week,
          rsi: weighting === 'equal' ? (item as any).rsiEqual : (item as any).rsi,
          marketCap: item.marketCap,
          stockCount: item.stockCount,
          isHistorical: snapshotIndex < snapshotIds.length - 1,
          dateLabel: snapshot.lastUpdated ? new Date(snapshot.lastUpdated).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''
        };

        if (!trajectoryMap.has(item.name)) {
          trajectoryMap.set(item.name, []);
        }
        trajectoryMap.get(item.name)?.push(itemData);
      });
    });

    const activeNames = new Set(chartData.map(d => d.name));
    return Array.from(trajectoryMap.values())
      .filter(t => t.length > 1 && activeNames.has(t[0].name));
  }, [multiSnapshotData, weighting, isRSI, chartData]);

  // Calculate dynamic domain
  const allMomentumValues = chartData.map(d => Math.abs(d.momentum));
  if (multiSnapshotData) {
    Object.values(multiSnapshotData).forEach(s => {
      s.data.forEach(d => {
        const val = weighting === 'equal' ? d.momentumEqual : d.momentum;
        if (val !== null) allMomentumValues.push(Math.abs(val));
      });
    });
  }
  const maxAbsMomentum = Math.max(...allMomentumValues, 5);
  const xBound = maxAbsMomentum * 1.5;

  let yMin: number, yMax: number, yOrigin: number;

  const getYValue = (d: any) => weighting === 'equal' ? (isRSI ? (d as any).rsiEqual : d.weekEqual) : (isRSI ? (d as any).rsi : d.week);

  if (isRSI) {
    yOrigin = 50;
    const rsiValues = chartData.map(d => d.rsi);
    if (multiSnapshotData) {
      Object.values(multiSnapshotData).forEach(s => {
        s.data.forEach(d => {
          const val = weighting === 'equal' ? (d as any).rsiEqual : (d as any).rsi;
          if (val !== null) rsiValues.push(val);
        });
      });
    }
    const minRsi = Math.min(...rsiValues, 30);
    const maxRsi = Math.max(...rsiValues, 70);
    yMin = Math.max(0, Math.floor(minRsi - 5));
    yMax = Math.min(100, Math.ceil(maxRsi + 5));
  } else {
    yOrigin = 0;
    const allWeekValues = chartData.map(d => Math.abs(d.week));
    if (multiSnapshotData) {
      Object.values(multiSnapshotData).forEach(s => {
        s.data.forEach(d => {
          const val = weighting === 'equal' ? d.weekEqual : d.week;
          if (val !== null) allWeekValues.push(Math.abs(val));
        });
      });
    }
    const maxAbsWeek = Math.max(...allWeekValues, 5);
    const yBound = maxAbsWeek * 1.5;
    yMin = -yBound;
    yMax = yBound;
  }

  // Apply zoom level and pan offset to domains
  // For RSI, we zoom in towards the origin (50)
  // For % Performance, we zoom in towards the origin (0)

  const xSpan = xBound / zoomLevel;
  const xDomainFinal = [-xSpan + pan.x, xSpan + pan.x];

  const yOriginCalc = isRSI ? 50 : 0;
  const ySpanTop = (yMax - yOriginCalc) / zoomLevel;
  const ySpanBottom = (yOriginCalc - yMin) / zoomLevel;

  const yDomainFinal = [
    (yOriginCalc - ySpanBottom) + pan.y,
    (yOriginCalc + ySpanTop) + pan.y
  ];

  // --- Zoom & Pan Event Handlers ---
  const zoomIn = () => setZoomLevel(prev => prev * 1.5);
  const zoomOut = () => {
    setZoomLevel(prev => {
      const newZoom = Math.max(1, prev / 1.5);
      if (newZoom === 1) setPan({ x: 0, y: 0 }); // Reset pan if fully zoomed out
      return newZoom;
    });
  };
  const resetZoom = () => {
    setZoomLevel(1);
    setPan({ x: 0, y: 0 });
  };

  // Pan handlers (move the view window, meaning we shift the domain opposite to the arrow direction)
  // E.g., clicking "Left" means we want to see what's to the left, so we decrease the X domain.
  const panAmountX = (xBound * 2) / zoomLevel * 0.2; // Pan by 20% of current view width
  const panAmountY = ((yMax - yMin) / zoomLevel) * 0.2;

  const panLeft = () => setPan(p => ({ ...p, x: p.x - panAmountX }));
  const panRight = () => setPan(p => ({ ...p, x: p.x + panAmountX }));
  const panUp = () => setPan(p => ({ ...p, y: p.y + panAmountY }));
  const panDown = () => setPan(p => ({ ...p, y: p.y - panAmountY }));

  // Mouse Drag Handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (zoomLevel <= 1) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || zoomLevel <= 1) return;

    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;

    // Pixel to Domain ratio approximation
    const containerWidth = e.currentTarget.clientWidth;
    const containerHeight = e.currentTarget.clientHeight;

    const xPanShift = -(deltaX / containerWidth) * ((xBound * 2) / zoomLevel);
    // Y axis is inverted on screen (down is +y in pixels, but -y in domain)
    const yPanShift = (deltaY / containerHeight) * ((yMax - yMin) / zoomLevel);

    setPan(p => ({
      x: p.x + xPanShift,
      y: p.y + yPanShift
    }));

    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
  };

  const renderQuadrantLabel = (props: any, text: string, color: string, align: 'left' | 'right', vAlign: 'top' | 'bottom') => {
    const { viewBox } = props;
    const { x, y, width, height } = viewBox;

    const textX = align === 'right' ? x + width - 20 : x + 20;
    const textY = vAlign === 'bottom' ? y + height - 20 : y + 20;

    return (
      <text
        x={textX}
        y={textY}
        fill={color}
        textAnchor={align === 'right' ? 'end' : 'start'}
        dominantBaseline={vAlign === 'bottom' ? 'auto' : 'hanging'}
        fontSize={14}
        fontWeight={900}
        style={{ opacity: 0.6, pointerEvents: 'none', userSelect: 'none' }}
      >
        {text}
      </text>
    );
  };

  // Helper to render traj lines and arrows
  const renderTrajectory = (traj: any[], index: number) => {
    const latest = traj[traj.length - 1];
    const snapshotCount = Object.keys(multiSnapshotData || {}).length;

    // Safety check just in case traj is empty
    if (!traj.length) return null;

    const name = traj[0].name;
    const isHovered = hoveredName === name;
    const isSomethingHovered = hoveredName !== null;

    const baseColor = isHovered ? '#ef4444' : '#3D3DFF'; // Red if hovered, Blue otherwise

    return (
      <React.Fragment key={`traj-group-${index}`}>
        {/* Trail lines */}
        {traj.slice(0, -1).map((point, i) => {
          const nextPoint = traj[i + 1];
          // Base opacity scales up as we get closer to current
          const baseOpacity = (i + 1) / snapshotCount * 0.4;
          // If hovered, boost opacity. If something ELSE is hovered, drop opacity heavily.
          const opacity = isHovered ? Math.max(0.6, baseOpacity * 2) : (isSomethingHovered ? baseOpacity * 0.15 : baseOpacity);

          return (
            <ReferenceLine
              key={`line-${index}-${i}`}
              segment={[
                { x: point.momentum, y: point.yValue },
                { x: nextPoint.momentum, y: nextPoint.yValue }
              ]}
              stroke={baseColor}
              strokeWidth={isHovered ? 3 : 2}
              strokeOpacity={opacity}
              style={{ pointerEvents: 'none' }} // Prevent lines from trapping mouse events
            />
          );
        })}
        {/* Historical points as small dots */}
        {traj.slice(0, -1).map((point, i) => {
          const baseOpacity = (i + 1) / snapshotCount * 0.3;
          const opacity = isHovered ? Math.max(0.6, baseOpacity * 2) : (isSomethingHovered ? baseOpacity * 0.15 : baseOpacity);

          return (
            <Scatter
              key={`point-${index}-${i}`}
              data={[point]}
              fill={baseColor}
              fillOpacity={opacity}
              onMouseEnter={() => setHoveredName(name)}
              onMouseLeave={() => setHoveredName(prev => prev === name ? null : prev)}
            >
              <Cell fill={baseColor} radius={isHovered ? 6 : 4} />
            </Scatter>
          );
        })}
      </React.Fragment>
    );
  };

  return (
    <div className="w-full bg-white border border-gray-50 rounded-2xl p-6 shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-black flex items-center gap-2">
          {groupBy === 'sector' ? 'Sector' : (groupBy === 'industry' ? 'Industry' : 'Stock')} Momentum vs {isRSI ? 'RSI' : 'Performance'}
          <span className="text-[11px] font-normal text-gray-400 bg-gray-50 px-2 py-0.5 rounded uppercase tracking-wider">All {groupBy === 'sector' ? 'Sectors' : (groupBy === 'industry' ? 'Industries' : 'Stocks')}</span>
        </h3>
        <div className="flex items-center gap-4 text-[11px] font-bold text-gray-500 uppercase tracking-tight">
          {zoomLevel > 1 && (
            <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-lg border border-gray-100">
              <button onClick={panLeft} className="p-1 rounded text-gray-600 hover:bg-white hover:shadow-sm" title="Pan Left">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
              </button>
              <div className="flex flex-col gap-1">
                <button onClick={panUp} className="p-1 rounded text-gray-600 hover:bg-white hover:shadow-sm" title="Pan Up">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 15l-6-6-6 6" /></svg>
                </button>
                <button onClick={panDown} className="p-1 rounded text-gray-600 hover:bg-white hover:shadow-sm" title="Pan Down">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
                </button>
              </div>
              <button onClick={panRight} className="p-1 rounded text-gray-600 hover:bg-white hover:shadow-sm" title="Pan Right">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
              </button>
            </div>
          )}

          <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-lg border border-gray-100">
            <button
              onClick={zoomOut}
              disabled={zoomLevel <= 1}
              className={`p-1.5 rounded transition-colors ${zoomLevel <= 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-white hover:shadow-sm'}`}
              title="Zoom Out"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>
            </button>
            <div className="w-px h-4 bg-gray-300"></div>
            <button
              onClick={resetZoom}
              disabled={zoomLevel === 1}
              className={`px-2 text-xs font-bold transition-colors ${zoomLevel === 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:text-black'}`}
            >
              {(zoomLevel * 100).toFixed(0)}%
            </button>
            <div className="w-px h-4 bg-gray-300"></div>
            <button
              onClick={zoomIn}
              className="p-1.5 rounded transition-colors text-gray-600 hover:bg-white hover:shadow-sm"
              title="Zoom In"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>
            </button>
          </div>
        </div>
      </div>

      <div
        className={`w-full h-[600px] select-none ${zoomLevel > 1 ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default'}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
      >
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart
            margin={{ top: 40, right: 60, bottom: 40, left: 40 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />

            <XAxis
              type="number"
              dataKey="momentum"
              name="Momentum"
              unit="%"
              stroke="#94a3b8"
              fontSize={11}
              fontWeight={500}
              tickLine={false}
              axisLine={{ stroke: '#f1f5f9' }}
              domain={xDomainFinal}
              allowDataOverflow={true}
              tickFormatter={(value) => value.toFixed(1)}
            >
              <Label value="Momentum (Acceleration)" offset={-25} position="insideBottom" style={{ fill: '#64748b', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }} />
            </XAxis>
            <YAxis
              type="number"
              dataKey={isRSI ? 'rsi' : 'week'}
              name={isRSI ? 'RSI' : 'Weekly Perf'}
              unit={isRSI ? '' : '%'}
              stroke="#94a3b8"
              fontSize={11}
              fontWeight={500}
              tickLine={false}
              axisLine={{ stroke: '#f1f5f9' }}
              domain={yDomainFinal}
              allowDataOverflow={true}
              tickFormatter={(value) => value.toFixed(1)}
            >
              <Label value={isRSI ? 'RSI (14)' : 'Weekly Performance'} angle={-90} position="insideLeft" style={{ fill: '#64748b', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }} />
            </YAxis>

            <Tooltip content={<CustomTooltip yAxis_={yAxis} />} cursor={{ strokeDasharray: '3 3', stroke: '#cbd5e1' }} />

            {/* Quadrant Backgrounds & Labels (only show if not zoomed in excessively to avoid clutter) */}
            {zoomLevel < 3 && (
              <>
                <ReferenceArea x1={0} x2={xBound} y1={yOrigin} y2={yMax} fill="#C6F6D5" fillOpacity={0.05} stroke="none" label={(props) => renderQuadrantLabel(props, 'LEADING', '#276749', 'right', 'top')} />
                <ReferenceArea x1={-xBound} x2={0} y1={yOrigin} y2={yMax} fill="#FEFCBF" fillOpacity={0.05} stroke="none" label={(props) => renderQuadrantLabel(props, 'WEAKENING', '#975A16', 'left', 'top')} />
                <ReferenceArea x1={-xBound} x2={0} y1={yMin} y2={yOrigin} fill="#FED7D7" fillOpacity={0.05} stroke="none" label={(props) => renderQuadrantLabel(props, 'LAGGING', '#9B2C2C', 'left', 'bottom')} />
                <ReferenceArea x1={0} x2={xBound} y1={yMin} y2={yOrigin} fill="#BEE3F8" fillOpacity={0.05} stroke="none" label={(props) => renderQuadrantLabel(props, 'IMPROVING', '#2C5282', 'right', 'bottom')} />
              </>
            )}

            {/* Quadrant Lines */}
            <ReferenceLine x={0} stroke="#cbd5e1" strokeWidth={2} />
            <ReferenceLine y={yOrigin} stroke="#cbd5e1" strokeWidth={2} />

            {/* RSI Overbought/Oversold Lines */}
            {isRSI && (
              <>
                <ReferenceLine y={70} stroke="#EF4444" strokeDasharray="3 3" strokeWidth={1} label={{ value: 'Overbought (70)', position: 'right', fill: '#EF4444', fontSize: 10 }} />
                <ReferenceLine y={30} stroke="#10B981" strokeDasharray="3 3" strokeWidth={1} label={{ value: 'Oversold (30)', position: 'right', fill: '#10B981', fontSize: 10 }} />
              </>
            )}

            {/* Trajectories */}
            {trajectories.map((traj, i) => renderTrajectory(traj, i))}

            {/* Current Points */}
            <Scatter
              name={groupBy}
              data={chartData}
              onMouseEnter={(e: any) => { if (e && e.name) setHoveredName(e.name); }}
              onMouseLeave={(e: any) => { setHoveredName(prev => (e && prev === e.name) ? null : prev); }}
            >
              {chartData.map((entry, index) => {
                const isHovered = hoveredName === entry.name;
                const isSomethingHovered = hoveredName !== null;
                const opacity = isHovered ? 1 : (isSomethingHovered ? 0.3 : 1);
                const color = isHovered ? '#ef4444' : '#3D3DFF'; // Red if hovered, otherwise blue

                return (
                  <Cell
                    key={`cell-${index}`}
                    fill={color}
                    fillOpacity={opacity}
                  />
                );
              })}
              <LabelList dataKey="name" position="right" style={{ fill: '#334155', fontSize: '10px', fontWeight: 600, pointerEvents: 'none' }} />
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
