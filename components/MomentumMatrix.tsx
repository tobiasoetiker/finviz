'use client';

import { GroupPerformance } from '@/types';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Label, ReferenceArea, LabelList } from 'recharts';

interface Props {
  data: GroupPerformance[];
}

export default function MomentumMatrix({ data }: Props) {
  // Use all data points as requested
  const chartData = [...data].sort((a, b) => b.marketCap - a.marketCap);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white px-4 py-3 shadow-xl border border-gray-100 rounded-xl text-sm z-50">
          <p className="font-bold text-black mb-2">{data.name}</p>
          <div className="space-y-1.5 text-[12px]">
            <p className="flex justify-between gap-6">
              <span className="text-gray-500">Momentum:</span>
              <span className={data.momentum > 0 ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
                {data.momentum.toFixed(2)}%
              </span>
            </p>
            <p className="flex justify-between gap-6">
              <span className="text-gray-500">Weekly:</span>
              <span className={data.week > 0 ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
                {data.week.toFixed(2)}%
              </span>
            </p>
            <p className="flex justify-between gap-6">
              <span className="text-gray-500">Market Cap:</span>
              <span className="text-gray-900 font-medium">
                ${(data.marketCap / 1e9).toFixed(1)}B
              </span>
            </p>
            <div className="pt-2 border-t border-gray-50 mt-2">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#7CFFC4]"></span>
                Top 3 Tickers (Weekly)
              </p>
              <div className="space-y-1">
                {data.topStocks?.map((stock: any) => (
                  <p key={stock.ticker} className="flex justify-between gap-4 font-mono">
                    <span className="text-gray-900 font-bold">{stock.ticker}</span>
                    <span className={stock.week > 0 ? 'text-green-600' : 'text-red-600'}>
                      {stock.week > 0 ? '+' : ''}{stock.week.toFixed(2)}%
                    </span>
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom label renderer to only show labels for the top-right quadrant
  const renderCustomLabel = (props: any) => {
    const { x, y, payload } = props;
    if (!payload || !payload.name) return null;

    const { momentum, week, name } = payload;

    // Only label if in the top-right quadrant (Leader)
    if (momentum > 0 && week > 0) {
      return (
        <text
          x={x}
          y={y - 12}
          fill="#3D3DFF"
          fontSize={10}
          fontWeight={800}
          textAnchor="middle"
          className="pointer-events-none select-none"
          style={{ textShadow: '0 1px 2px rgba(255,255,255,0.8)' }}
        >
          {name}
        </text>
      );
    }
    return null;
  };

  return (
    <div className="w-full bg-white border border-gray-50 rounded-2xl p-6 shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-black flex items-center gap-2">
          Industry Momentum vs Performance
          <span className="text-[11px] font-normal text-gray-400 bg-gray-50 px-2 py-0.5 rounded uppercase tracking-wider">All Industries</span>
        </h3>
        <div className="flex items-center gap-4 text-[11px] font-bold text-gray-500 uppercase tracking-tight">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-[#7CFFC4] opacity-40 border border-[#7CFFC4]"></div>
            <span>Leader Quadrant</span>
          </div>
        </div>
      </div>

      <div className="w-full h-[600px]">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 40, right: 60, bottom: 40, left: 40 }}>
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
              domain={['auto', 'auto']}
            >
              <Label value="Momentum (Weekly - Monthly)" offset={-25} position="insideBottom" style={{ fill: '#64748b', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }} />
            </XAxis>
            <YAxis
              type="number"
              dataKey="week"
              name="Weekly Perf"
              unit="%"
              stroke="#94a3b8"
              fontSize={11}
              fontWeight={500}
              tickLine={false}
              axisLine={{ stroke: '#f1f5f9' }}
              domain={['auto', 'auto']}
            >
              <Label value="Weekly Performance" angle={-90} position="insideLeft" style={{ fill: '#64748b', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }} />
            </YAxis>

            {/* Highlight Top Right Quadrant (Leaders) - Rendered behind dots */}
            <ReferenceArea
              x1={0}
              x2={200}
              y1={0}
              y2={200}
              fill="#7CFFC4"
              fillOpacity={0.2}
              stroke="#7CFFC4"
              strokeWidth={1}
              strokeDasharray="4 4"
            />

            {/* Quadrant Lines */}
            <ReferenceLine x={0} stroke="#cbd5e1" strokeWidth={2} />
            <ReferenceLine y={0} stroke="#cbd5e1" strokeWidth={2} />

            <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3', stroke: '#cbd5e1' }} />

            <Scatter
              name="Industries"
              data={chartData}
              fill="#3D3DFF"
              fillOpacity={0.6}
              stroke="#3D3DFF"
              strokeWidth={1}
            >
              <LabelList dataKey="name" content={renderCustomLabel} />
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-6 flex flex-wrap gap-4 text-[10px] text-gray-400 font-bold uppercase tracking-widest text-center justify-center">
        <div className="bg-gray-50 px-4 py-2 rounded-lg border border-gray-100 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#3D3DFF]"></span>
          Industries
        </div>
        <div className="bg-green-50 text-green-700 px-4 py-2 rounded-lg border border-green-100 italic">
          Labels shown for Top-Right Quadrant only (Leaders)
        </div>
      </div>
    </div>
  );
}
