'use client';

import { useMemo, useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import VolatileStocks from './VolatileStocks';
import VolatilityBacktest from './VolatilityBacktest';
import { VolatileStockRow, VolatilityBacktestRow } from '@/types';
import { ChevronDown, Check, Zap, History } from 'lucide-react';

interface Props {
    snapshots: { id: string; label: string; timestamp: number }[];
    volatileStocks: VolatileStockRow[];
    lookbackDays: number;
    groupBy: 'ticker' | 'industry' | 'sector';
    mode: 'live' | 'backtest';
    backtestDays: number;
    backtestData?: { rows: VolatilityBacktestRow[]; signalDate: string; currentDate: string };
}

const groupByLabels = { ticker: 'Stocks', industry: 'Industries', sector: 'Sectors' } as const;
const topOptions = [10, 20, 50, 0] as const;

export default function VolatilityContent({ snapshots, volatileStocks, lookbackDays, groupBy, mode, backtestDays, backtestData }: Props) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const currentSnapshot = searchParams.get('snapshot') || (snapshots.length > 0 ? snapshots[0].id : '');
    const currentSectorParam = searchParams.get('sector');
    const selectedSectors = currentSectorParam ? currentSectorParam.split(',') : [];
    const [topN, setTopN] = useState(20);

    const [isSectorDropdownOpen, setIsSectorDropdownOpen] = useState(false);
    const sectorDropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (sectorDropdownRef.current && !sectorDropdownRef.current.contains(event.target as Node)) {
                setIsSectorDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const sectors = useMemo(() => {
        const dataForSectors = mode === 'live' ? volatileStocks : (backtestData?.rows || []);
        if (mode === 'live') {
            return [...new Set(volatileStocks.map(r => r.sector))].sort();
        } else {
             return [...new Set((backtestData?.rows || []).map(r => r.sector))].sort();
        }
    }, [volatileStocks, backtestData, mode]);

    const filteredLiveStocks = useMemo(() => {
        let result = volatileStocks;
        if (selectedSectors.length > 0 && groupBy !== 'sector') {
            result = result.filter(r => selectedSectors.includes(r.sector));
        }
        if (topN > 0) {
            result = result.slice(0, topN);
        }
        return result;
    }, [volatileStocks, selectedSectors, topN, groupBy]);

    const filteredBacktestData = useMemo(() => {
        if (!backtestData) return undefined;
        let result = backtestData.rows;
        if (selectedSectors.length > 0) {
            result = result.filter(r => selectedSectors.includes(r.sector));
        }
        if (topN > 0) {
            result = result.slice(0, topN);
        }
        return {
            ...backtestData,
            rows: result
        };
    }, [backtestData, selectedSectors, topN]);

    const updateParam = (key: string, value: string) => {
        const params = new URLSearchParams(window.location.search);
        if (value === 'all' && key === 'sector') {
            params.delete('sector');
        } else {
            params.set(key, value);
        }
        router.push(`/volatility?${params.toString()}`);
    };

    const handleSectorToggle = (sector: string) => {
        let newSectors: string[];
        if (sector === 'all') {
            newSectors = [];
        } else if (selectedSectors.includes(sector)) {
            newSectors = selectedSectors.filter(s => s !== sector);
        } else {
            newSectors = [...selectedSectors, sector];
        }

        const params = new URLSearchParams(window.location.search);
        if (newSectors.length === 0) {
            params.delete('sector');
        } else {
            params.set('sector', newSectors.join(','));
        }
        router.push(`/volatility?${params.toString()}`);
    };

    return (
        <div className="space-y-16">
            <div className="sticky top-0 z-30 bg-surface/95 backdrop-blur-sm border-b border-slate-100 py-4">
                <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex p-1 bg-slate-100 rounded-lg">
                        <button
                            onClick={() => updateParam('mode', 'live')}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${mode === 'live'
                                ? 'bg-white text-slate-900 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            <Zap size={14} fill={mode === 'live' ? 'currentColor' : 'none'} className={mode === 'live' ? 'text-amber-500' : ''} />
                            Live
                        </button>
                        <button
                            onClick={() => updateParam('mode', 'backtest')}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${mode === 'backtest'
                                ? 'bg-white text-slate-900 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            <History size={14} className={mode === 'backtest' ? 'text-indigo-500' : ''} />
                            Backtest
                        </button>
                    </div>

                    <div className="w-px h-6 bg-slate-200" />

                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Snapshot</label>
                    <select
                        value={currentSnapshot}
                        onChange={(e) => updateParam('snapshot', e.target.value)}
                        className="text-sm font-semibold text-slate-800 border border-slate-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-slate-400"
                    >
                        {snapshots.map((s) => (
                            <option key={s.id} value={s.id}>{s.label}</option>
                        ))}
                    </select>

                    {mode === 'live' && (
                        <>
                            <div className="w-px h-6 bg-slate-200" />
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Group By</label>
                            <select
                                value={groupBy}
                                onChange={(e) => updateParam('groupBy', e.target.value)}
                                className="text-sm font-semibold text-slate-800 border border-slate-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-slate-400"
                            >
                                <option value="ticker">Stock</option>
                                <option value="industry">Industry</option>
                                <option value="sector">Sector</option>
                            </select>
                        </>
                    )}

                    {(mode === 'backtest' || (mode === 'live' && groupBy !== 'sector')) && (
                        <>
                            <div className="w-px h-6 bg-slate-200" />

                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sector</label>
                            <div className="relative" ref={sectorDropdownRef}>
                                <button
                                    onClick={() => setIsSectorDropdownOpen(!isSectorDropdownOpen)}
                                    className={`flex items-center justify-between gap-3 px-3 py-1.5 bg-white border rounded-md text-sm font-semibold transition-all min-w-[200px] ${isSectorDropdownOpen
                                        ? 'border-slate-400 ring-2 ring-slate-400 text-slate-800'
                                        : 'border-slate-300 text-slate-800 hover:border-slate-400'
                                        }`}
                                >
                                    <span className="truncate">
                                        {selectedSectors.length === 0
                                            ? 'All Sectors'
                                            : selectedSectors.length === 1
                                                ? selectedSectors[0]
                                                : `${selectedSectors.length} Sectors`}
                                    </span>
                                    <ChevronDown size={14} className={`text-slate-500 transition-transform ${isSectorDropdownOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {isSectorDropdownOpen && (
                                    <div className="absolute top-[calc(100%+4px)] left-0 w-64 bg-white border border-slate-200 shadow-xl rounded-lg py-1.5 z-50 max-h-80 overflow-y-auto">
                                        <label className="flex items-center gap-3 px-3 py-2 transition-colors hover:bg-slate-50 cursor-pointer group">
                                            <div className="relative flex items-center justify-center">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedSectors.length === 0}
                                                    onChange={() => handleSectorToggle('all')}
                                                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer appearance-none peer bg-white"
                                                />
                                                <div className={`absolute inset-0 border rounded flex items-center justify-center pointer-events-none transition-colors ${selectedSectors.length === 0 ? 'bg-blue-600 border-blue-600' : 'border-slate-300 bg-white'}`}>
                                                    {selectedSectors.length === 0 && <Check size={12} className="text-white" strokeWidth={3} />}
                                                </div>
                                            </div>
                                            <span className={`text-sm font-semibold transition-colors ${selectedSectors.length === 0 ? 'text-slate-900 group-hover:text-blue-600' : 'text-slate-600 group-hover:text-slate-900'}`}>
                                                All Sectors
                                            </span>
                                        </label>

                                        <div className="h-px bg-slate-100 my-1 mx-3" />

                                        {sectors.map(s => {
                                            const isSelected = selectedSectors.includes(s);
                                            return (
                                                <label key={s} className="flex items-center gap-3 px-3 py-2 transition-colors hover:bg-slate-50 cursor-pointer group">
                                                    <div className="relative flex items-center justify-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            onChange={() => handleSectorToggle(s)}
                                                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer appearance-none peer bg-white"
                                                        />
                                                        <div className={`absolute inset-0 border rounded flex items-center justify-center pointer-events-none transition-colors ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-slate-300 bg-white'}`}>
                                                            {isSelected && <Check size={12} className="text-white" strokeWidth={3} />}
                                                        </div>
                                                    </div>
                                                    <span className={`text-sm font-semibold transition-colors ${isSelected ? 'text-slate-900 group-hover:text-blue-600' : 'text-slate-600 group-hover:text-slate-900'}`}>
                                                        {s}
                                                    </span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    <div className="w-px h-6 bg-slate-200" />

                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Show</label>
                    <select
                        value={topN}
                        onChange={(e) => setTopN(parseInt(e.target.value, 10))}
                        className="text-sm font-semibold text-slate-800 border border-slate-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-slate-400"
                    >
                        {topOptions.map((n) => (
                            <option key={n} value={n}>{n === 0 ? 'All' : `Top ${n}`}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div>
                <div className="mb-6">
                    <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
                        {mode === 'live' ? 'Most Volatile' : 'Volatility Return Backtest'} {mode === 'live' ? groupByLabels[groupBy] : 'Stocks'}
                        {mode === 'live' && (
                             <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full tracking-widest uppercase align-middle">ATR%</span>
                        )}
                    </h2>
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                        {mode === 'live' ? (
                            <>
                                <p className="text-slate-500 text-sm">Average daily move over the last</p>
                                <select
                                    value={lookbackDays}
                                    onChange={(e) => updateParam('lookbackDays', e.target.value)}
                                    className="text-sm font-semibold text-slate-800 border border-slate-300 rounded-md px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
                                >
                                    {[1, 3, 5, 10, 14].map((d) => (
                                        <option key={d} value={d}>{d} {d === 1 ? 'trading day' : 'trading days'}</option>
                                    ))}
                                </select>
                            </>
                        ) : (
                            <>
                                <p className="text-slate-500 text-sm">Performance of most volatile stocks over</p>
                                <div className="flex gap-1">
                                    {[1, 2, 3, 5, 10, 15].map((d) => (
                                        <button
                                            key={d}
                                            onClick={() => updateParam('backtestDays', String(d))}
                                            className={`px-2.5 py-0.5 rounded-md text-xs font-semibold transition-colors ${backtestDays === d
                                                ? 'bg-indigo-100 text-indigo-700 border border-indigo-300'
                                                : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
                                                }`}
                                        >
                                            {d}d
                                        </button>
                                    ))}
                                </div>
                                <p className="text-slate-500 text-sm">holding period, relative to market.</p>
                            </>
                        )}
                    </div>
                </div>

                {mode === 'live' ? (
                    <VolatileStocks data={filteredLiveStocks} groupBy={groupBy} />
                ) : (
                    <VolatilityBacktest 
                        data={filteredBacktestData?.rows || []} 
                        signalDate={filteredBacktestData?.signalDate || ''} 
                        currentDate={filteredBacktestData?.currentDate || ''} 
                    />
                )}
            </div>
        </div>
    );
}
