"use client"

import { VolatilityBacktestRow } from '@/types';
import { useState, useMemo } from 'react';

type SortKey = keyof VolatilityBacktestRow;

const formatMarketCap = (value: number) => {
    if (value >= 1e12) return `${(value / 1e12).toFixed(2)}T`;
    if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
    return value.toLocaleString();
};

export default function VolatilityBacktest({ data, signalDate, currentDate }: { data: VolatilityBacktestRow[]; signalDate: string; currentDate: string }) {
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({ key: 'returnPct', direction: 'desc' });

    const sortedData = useMemo(() => {
        if (!data) return [];
        const sorted = [...data];
        sorted.sort((a, b) => {
            const aValue = a[sortConfig.key];
            const bValue = b[sortConfig.key];
            if (aValue === undefined) return 1;
            if (bValue === undefined) return -1;
            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
        return sorted;
    }, [data, sortConfig]);

    const requestSort = (key: SortKey) => {
        let direction: 'asc' | 'desc' = 'desc';
        if (sortConfig.key === key && sortConfig.direction === 'desc') {
            direction = 'asc';
        }
        setSortConfig({ key, direction });
    };

    const getSortIndicator = (key: SortKey) => {
        if (sortConfig.key !== key) return null;
        return (
            <span className="ml-1 inline-block text-[10px] text-slate-400">
                {sortConfig.direction === 'asc' ? '▲' : '▼'}
            </span>
        );
    };

    const HeaderCell = ({ label, sortKey, alignRight = false, hiddenClass = '' }: { label: string; sortKey: SortKey; alignRight?: boolean; hiddenClass?: string }) => (
        <th
            className={`py-2.5 px-4 font-semibold text-slate-500 uppercase text-xs tracking-wider whitespace-nowrap cursor-pointer hover:bg-slate-100 transition-colors ${alignRight ? 'text-right' : ''} ${hiddenClass}`}
            onClick={() => requestSort(sortKey)}
        >
            <div className={`flex items-center ${alignRight ? 'justify-end' : ''}`}>
                {label}
                {getSortIndicator(sortKey)}
            </div>
        </th>
    );

    const formatPct = (val: number) => {
        const sign = val >= 0 ? '+' : '';
        return `${sign}${val.toFixed(2)}%`;
    };

    const pctColor = (val: number) => val >= 0 ? 'text-emerald-600' : 'text-rose-600';
    const pctBg = (val: number) => val >= 0 ? 'bg-emerald-50' : 'bg-rose-50';

    // Summary stats
    const avgReturn = data.length > 0 ? data.reduce((sum, r) => sum + r.returnPct, 0) / data.length : 0;
    const avgExcess = data.length > 0 ? data.reduce((sum, r) => sum + r.excessReturnPct, 0) / data.length : 0;
    const spyReturn = data.length > 0 ? data[0].spyReturnPct : 0;
    const winnersCount = data.filter(r => r.returnPct > 0).length;
    const avgAtr = data.length > 0 ? data.reduce((sum, r) => sum + r.signalAtrPct, 0) / data.length : 0;

    if (!data || data.length === 0) {
        return (
            <div className="py-10 text-center text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                <p>No historical volatility data found for this period.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/60">
                    <div className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">Signals</div>
                    <div className="text-lg font-bold text-slate-900">{data.length}</div>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/60">
                    <div className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">Win Rate</div>
                    <div className={`text-lg font-bold ${winnersCount / data.length >= 0.5 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {((winnersCount / data.length) * 100).toFixed(0)}%
                    </div>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/60">
                    <div className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">Avg ATR%</div>
                    <div className="text-lg font-bold text-amber-700">{avgAtr.toFixed(2)}%</div>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/60">
                    <div className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">Avg Return</div>
                    <div className={`text-lg font-bold ${pctColor(avgReturn)}`}>{formatPct(avgReturn)}</div>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/60">
                    <div className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">vs Market</div>
                    <div className={`text-lg font-bold ${pctColor(avgExcess)}`}>{formatPct(avgExcess)}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Mkt: {formatPct(spyReturn)}</div>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto table-scroll-container card">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                            <HeaderCell label="Ticker" sortKey="ticker" hiddenClass="sticky left-0 z-10 bg-slate-50" />
                            <HeaderCell label="Company" sortKey="company" />
                            <HeaderCell label="Sector" sortKey="sector" />
                            <HeaderCell label="Signal ATR%" sortKey="signalAtrPct" alignRight />
                            <HeaderCell label="Signal Price" sortKey="signalPrice" alignRight />
                            <HeaderCell label="Current Price" sortKey="currentPrice" alignRight />
                            <HeaderCell label="Market Cap" sortKey="marketCap" alignRight />
                            <HeaderCell label="Return" sortKey="returnPct" alignRight />
                            <HeaderCell label="vs Mkt" sortKey="excessReturnPct" alignRight />
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {sortedData.map((row) => (
                            <tr key={row.ticker} className="hover:bg-slate-50 transition-colors group">
                                <td className="py-3 px-4 sticky left-0 z-10 bg-white group-hover:bg-slate-50">
                                    <a
                                        href={`https://elite.finviz.com/quote.ashx?t=${row.ticker}&ty=c&r=m3&p=d&b=1`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-xs hover:bg-slate-200 transition-colors cursor-pointer"
                                    >
                                        {row.ticker}
                                    </a>
                                </td>
                                <td className="py-3 px-4 text-xs text-slate-700 font-medium truncate max-w-[120px]" title={row.company}>{row.company}</td>
                                <td className="py-3 px-4 text-xs text-slate-600">
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-50 text-indigo-700">
                                        {row.sector}
                                    </span>
                                </td>
                                <td className="py-3 px-4 text-right">
                                    <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded tabular-nums text-xs">
                                        {row.signalAtrPct.toFixed(2)}%
                                    </span>
                                </td>
                                <td className="py-3 px-4 font-bold text-slate-900 tabular-nums text-xs text-right">
                                    ${row.signalPrice.toFixed(2)}
                                </td>
                                <td className="py-3 px-4 font-bold text-slate-900 tabular-nums text-xs text-right">
                                    ${row.currentPrice.toFixed(2)}
                                </td>
                                <td className="py-3 px-4 text-right text-xs tabular-nums text-slate-600 font-medium">
                                    {formatMarketCap(row.marketCap)}
                                </td>
                                <td className="py-3 px-4 text-right">
                                    <span className={`font-bold tabular-nums px-2 py-0.5 rounded text-xs ${pctBg(row.returnPct)} ${pctColor(row.returnPct)}`}>
                                        {formatPct(row.returnPct)}
                                    </span>
                                </td>
                                <td className="py-3 px-4 text-right">
                                    <span className={`font-bold tabular-nums px-2 py-0.5 rounded text-xs ${pctBg(row.excessReturnPct)} ${pctColor(row.excessReturnPct)}`}>
                                        {formatPct(row.excessReturnPct)}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
