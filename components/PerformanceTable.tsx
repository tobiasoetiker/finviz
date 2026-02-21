'use client';

import { GroupPerformance } from '@/types';
import { useState } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, Search, Filter } from 'lucide-react';
import { formatPercent, formatMoney } from '@/lib/formatters';

interface Props {
    data: GroupPerformance[];
    title?: string;
}

type SortKey = 'name' | 'week' | 'month' | 'momentum' | 'marketCap';

export default function PerformanceTable({ data, title = 'Industry Performance' }: Props) {
    const [sortKey, setSortKey] = useState<SortKey>('momentum');
    const [sortDesc, setSortDesc] = useState(true);
    const [filter, setFilter] = useState('');

    const filteredData = data.filter(item =>
        item.name.toLowerCase().includes(filter.toLowerCase())
    );

    const sortedData = [...filteredData].sort((a, b) => {
        const valA = a[sortKey];
        const valB = b[sortKey];

        if (typeof valA === 'string' && typeof valB === 'string') {
            return sortDesc ? valB.localeCompare(valA) : valA.localeCompare(valB);
        }

        return sortDesc ? (Number(valB) || 0) - (Number(valA) || 0) : (Number(valA) || 0) - (Number(valB) || 0);
    });

    const handleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDesc(!sortDesc);
        } else {
            setSortKey(key);
            setSortDesc(true);
        }
    };

    const SortIcon = ({ column }: { column: SortKey }) => {
        if (sortKey !== column) return <ArrowUpDown size={14} className="text-slate-300" />;
        return sortDesc ? <ArrowDown size={14} className="text-blue-600" /> : <ArrowUp size={14} className="text-blue-600" />;
    };

    // Calculate max market cap for bar visualization
    const maxMarketCap = Math.max(...data.map(item => item.marketCap || 0));

    // Modern Badge Style
    const getBadgeClass = (val: number | null | undefined) => {
        const base = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium";
        if (val === null || val === undefined) return `${base} bg-slate-100 text-slate-800`;
        if (val > 0) return `${base} bg-emerald-100 text-emerald-800`;
        if (val < 0) return `${base} bg-rose-100 text-rose-800`;
        return `${base} bg-slate-100 text-slate-800`;
    };

    return (
        <div className="modern-card p-0 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center bg-white/50 backdrop-blur-sm">
                <h3 className="text-lg font-bold text-slate-800 mb-4 sm:mb-0 flex items-center">
                    <Filter size={18} className="mr-2 text-slate-400" />
                    {title}
                </h3>
                <div className="relative w-full sm:w-64">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search size={16} className="text-slate-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search industries..."
                        className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg leading-5 bg-slate-50 text-slate-600 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all shadow-sm"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                    />
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left align-middle">
                    <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-xs">
                        <tr>
                            <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('name')}>
                                <div className="flex items-center space-x-1"><span>Name</span> <SortIcon column="name" /></div>
                            </th>
                            <th className="px-6 py-4 text-right cursor-pointer hover:bg-slate-100 transition-colors w-32" onClick={() => handleSort('marketCap')}>
                                <div className="flex items-center justify-end space-x-1"><span>Market Cap</span> <SortIcon column="marketCap" /></div>
                            </th>
                            <th className="px-6 py-4 text-right cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('week')}>
                                <div className="flex items-center justify-end space-x-1"><span>1 Week</span> <SortIcon column="week" /></div>
                            </th>
                            <th className="px-6 py-4 text-right cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('month')}>
                                <div className="flex items-center justify-end space-x-1"><span>1 Month</span> <SortIcon column="month" /></div>
                            </th>
                            <th className="px-6 py-4 text-right cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('momentum')}>
                                <div className="flex items-center justify-end space-x-1"><span>Momentum</span> <SortIcon column="momentum" /></div>
                            </th>
                            <th className="px-6 py-4 text-left">
                                <div className="flex items-center space-x-1"><span>Top Drivers</span></div>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {sortedData.map((item: GroupPerformance) => (
                            <tr key={item.name} className="hover:bg-slate-50/80 transition-colors group">
                                <th scope="row" className="px-6 py-4 font-medium text-slate-700 whitespace-nowrap max-w-[200px] truncate" title={item.name}>
                                    {item.name}
                                </th>
                                <td className="px-6 py-4 text-right text-slate-500 font-mono text-xs relative">
                                    {/* Visual Bar Background */}
                                    <div
                                        className="absolute inset-y-0 right-0 bg-blue-200/50 transition-all duration-500 border-l border-blue-300/50"
                                        style={{ width: `${Math.max((item.marketCap / maxMarketCap) * 100, 1)}%`, zIndex: 0 }}
                                    />
                                    <span className="relative z-10 font-bold text-slate-700">{formatMoney(item.marketCap)}</span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <span className={getBadgeClass(item.week)}>{formatPercent(item.week)}</span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <span className={getBadgeClass(item.month)}>{formatPercent(item.month)}</span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${item.momentum > 0 ? 'text-blue-700 bg-blue-50' : 'text-slate-600 bg-slate-100'}`}>
                                        {formatPercent(item.momentum)}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-left">
                                    <div className="flex flex-wrap gap-1.5">
                                        {item.topStocks?.map((stock: { ticker: string; week: number }) => (
                                            <span key={stock.ticker} className="text-[10px] font-bold text-slate-400 bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded uppercase tracking-tighter hover:text-blue-600 hover:border-blue-200 transition-colors cursor-default">
                                                {stock.ticker}
                                            </span>
                                        ))}
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {sortedData.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                                    <div className="flex flex-col items-center justify-center space-y-2">
                                        <Search size={32} className="opacity-20" />
                                        <p>No industries found matching "{filter}"</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            <div className="bg-slate-50 p-3 text-xs text-slate-400 text-center border-t border-slate-100">
                Showing top {Math.min(filteredData.length, 50)} items of {filteredData.length}
            </div>
        </div>
    );
}
