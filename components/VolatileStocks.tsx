"use client"

import { VolatileStockRow } from '@/types';
import { useState, useMemo } from 'react';

const formatMarketCap = (value: number) => {
    if (value >= 1e12) return `${(value / 1e12).toFixed(2)}T`;
    if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
    return value.toLocaleString();
};

type SortKey = keyof VolatileStockRow;

export default function VolatileStocks({ data, groupBy }: { data: VolatileStockRow[]; groupBy: 'ticker' | 'industry' | 'sector' }) {
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({ key: 'atrPct', direction: 'desc' });

    const sortedData = useMemo(() => {
        if (!data) return [];
        const sortableItems = [...data];
        sortableItems.sort((a, b) => {
            let aValue = a[sortConfig.key];
            let bValue = b[sortConfig.key];

            if (aValue === undefined) aValue = '';
            if (bValue === undefined) bValue = '';

            if (aValue < bValue) {
                return sortConfig.direction === 'asc' ? -1 : 1;
            }
            if (aValue > bValue) {
                return sortConfig.direction === 'asc' ? 1 : -1;
            }
            return 0;
        });
        return sortableItems;
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

    const HeaderCell = ({ label, sortKey, alignRight = false, hiddenClass = '' }: { label: string, sortKey: SortKey, alignRight?: boolean, hiddenClass?: string }) => (
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

    if (!data || data.length === 0) {
        return (
            <div className="py-10 text-center text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                <p>No volatility data available for the selected period.</p>
            </div>
        );
    }

    const isGrouped = groupBy !== 'ticker';
    const nameLabel = groupBy === 'sector' ? 'Sector' : groupBy === 'industry' ? 'Industry' : 'Ticker';

    return (
        <div className="overflow-x-auto table-scroll-container card">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                        <HeaderCell label={nameLabel} sortKey="name" hiddenClass="sticky left-0 z-10 bg-slate-50" />
                        {!isGrouped && <HeaderCell label="Company" sortKey="company" />}
                        {groupBy === 'ticker' && <HeaderCell label="Sector" sortKey="sector" />}
                        {groupBy === 'industry' && <HeaderCell label="Sector" sortKey="sector" />}
                        {isGrouped && <HeaderCell label="Stocks" sortKey="stockCount" alignRight />}
                        {!isGrouped && <HeaderCell label="Price" sortKey="price" alignRight />}
                        <HeaderCell label="ATR%" sortKey="atrPct" alignRight />
                        <HeaderCell label="Today" sortKey="latestChange" alignRight />
                        <HeaderCell label="Max Move" sortKey="maxMove" alignRight />
                        <HeaderCell label="Range" sortKey="minChange" alignRight />
                        <HeaderCell label="Market Cap" sortKey="marketCap" alignRight />
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {sortedData.map((row) => (
                        <tr key={row.name} className="hover:bg-slate-50 transition-colors group">
                            <td className="py-3 px-4 sticky left-0 z-10 bg-white group-hover:bg-slate-50">
                                {isGrouped ? (
                                    <span className="font-bold text-slate-900 text-xs">{row.name}</span>
                                ) : (
                                    <a
                                        href={`https://elite.finviz.com/quote.ashx?t=${row.name}&ty=c&r=m3&p=d&b=1`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-xs hover:bg-slate-200 transition-colors cursor-pointer"
                                    >
                                        {row.name}
                                    </a>
                                )}
                            </td>
                            {!isGrouped && (
                                <td className="py-3 px-4 text-xs text-slate-700 font-medium truncate max-w-[120px]" title={row.company}>{row.company}</td>
                            )}
                            {(groupBy === 'ticker' || groupBy === 'industry') && (
                                <td className="py-3 px-4 text-xs text-slate-600">
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-50 text-indigo-700">
                                        {row.sector}
                                    </span>
                                </td>
                            )}
                            {isGrouped && (
                                <td className="py-3 px-4 font-semibold text-slate-600 tabular-nums text-xs text-right">
                                    {row.stockCount}
                                </td>
                            )}
                            {!isGrouped && (
                                <td className="py-3 px-4 font-bold text-slate-900 tabular-nums text-xs text-right">
                                    ${row.price.toFixed(2)}
                                </td>
                            )}
                            <td className="py-3 px-4 text-right">
                                <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded tabular-nums text-xs">
                                    {row.atrPct.toFixed(2)}%
                                </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                                <span className={`font-bold tabular-nums px-2 py-0.5 rounded text-xs ${
                                    row.latestChange >= 0
                                        ? 'bg-emerald-50 text-emerald-600'
                                        : 'bg-rose-50 text-rose-600'
                                }`}>
                                    {row.latestChange >= 0 ? '+' : ''}{row.latestChange.toFixed(2)}%
                                </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                                <span className="font-bold text-slate-700 tabular-nums text-xs">
                                    {row.maxMove.toFixed(2)}%
                                </span>
                            </td>
                            <td className="py-3 px-4 text-right text-xs tabular-nums text-slate-600 whitespace-nowrap">
                                <span className="text-rose-500">{row.minChange.toFixed(2)}%</span>
                                <span className="text-slate-300 mx-1">/</span>
                                <span className="text-emerald-500">+{row.maxChange.toFixed(2)}%</span>
                            </td>
                            <td className="py-3 px-4 text-right text-xs tabular-nums text-slate-600 font-medium">
                                {formatMarketCap(row.marketCap)}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
