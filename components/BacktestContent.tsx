'use client';

import { useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import BollingerBacktest from './BollingerBacktest';
import { BollingerBacktestRow } from '@/types';

interface Props {
    snapshots: { id: string; label: string; timestamp: number }[];
    bollingerRsiThreshold: number;
    backtestDays: number;
    bollingerBacktest?: { rows: BollingerBacktestRow[]; signalDate: string; currentDate: string };
}

export default function BacktestContent({ snapshots, bollingerRsiThreshold, backtestDays, bollingerBacktest }: Props) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const currentSnapshot = searchParams.get('snapshot') || (snapshots.length > 0 ? snapshots[0].id : '');
    const currentSector = searchParams.get('sector') || 'all';

    const sectors = useMemo(() => {
        if (!bollingerBacktest) return [];
        return [...new Set(bollingerBacktest.rows.map(r => r.sector))].sort();
    }, [bollingerBacktest]);

    const filteredBacktest = useMemo(() => {
        if (!bollingerBacktest) return undefined;
        if (currentSector === 'all') return bollingerBacktest;
        return {
            ...bollingerBacktest,
            rows: bollingerBacktest.rows.filter(r => r.sector === currentSector),
        };
    }, [bollingerBacktest, currentSector]);

    const updateParam = (key: string, value: string) => {
        const params = new URLSearchParams(window.location.search);
        if (value === 'all' && key === 'sector') {
            params.delete('sector');
        } else {
            params.set(key, value);
        }
        router.push(`/backtest?${params.toString()}`);
    };

    return (
        <div className="space-y-16">
            <div className="sticky top-0 z-30 bg-surface/95 backdrop-blur-sm border-b border-slate-100 py-4">
                <div className="flex items-center gap-4 flex-wrap">
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

                    <div className="w-px h-6 bg-slate-200" />

                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sector</label>
                    <select
                        value={currentSector}
                        onChange={(e) => updateParam('sector', e.target.value)}
                        className="text-sm font-semibold text-slate-800 border border-slate-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-slate-400"
                    >
                        <option value="all">All Sectors</option>
                        {sectors.map((s) => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                </div>
            </div>

            {filteredBacktest && filteredBacktest.rows.length > 0 ? (
                <div>
                    <div className="mb-6">
                        <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
                            Signal Backtest
                        </h2>
                        <div className="flex items-center gap-3 mt-2 flex-wrap">
                            <p className="text-slate-500 text-sm">Stocks with RSI below</p>
                            <input
                                type="number"
                                min={1}
                                max={100}
                                defaultValue={bollingerRsiThreshold}
                                onBlur={(e) => {
                                    const val = Math.max(1, Math.min(100, parseInt(e.target.value, 10) || 30));
                                    updateParam('bollingerRsi', String(val));
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                                }}
                                className="w-16 text-center border border-slate-300 rounded-md px-2 py-0.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-rose-400"
                            />
                            <p className="text-slate-500 text-sm">| Performance over</p>
                            <div className="flex gap-1">
                                {[1, 2, 3, 4, 5].map((d) => (
                                    <button
                                        key={d}
                                        onClick={() => updateParam('backtestDays', String(d))}
                                        className={`px-2.5 py-0.5 rounded-md text-xs font-semibold transition-colors ${
                                            backtestDays === d
                                                ? 'bg-amber-100 text-amber-700 border border-amber-300'
                                                : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
                                        }`}
                                    >
                                        {d}d
                                    </button>
                                ))}
                            </div>
                            <p className="text-slate-500 text-sm">trading days since oversold signal, relative to market.</p>
                        </div>
                    </div>
                    <BollingerBacktest data={filteredBacktest.rows} signalDate={filteredBacktest.signalDate} currentDate={filteredBacktest.currentDate} />
                </div>
            ) : (
                <div className="py-10 text-center text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                    <p>No previous-day Bollinger signals found to backtest{currentSector !== 'all' ? ` in ${currentSector}` : ''}.</p>
                </div>
            )}
        </div>
    );
}
