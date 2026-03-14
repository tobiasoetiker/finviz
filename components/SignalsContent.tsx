'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import BollingerSignals from './BollingerSignals';
import BollingerBacktest from './BollingerBacktest';
import { BollingerSignalRow, BollingerBacktestRow } from '@/types';

interface Props {
    snapshots: { id: string; label: string; timestamp: number }[];
    bollingerSignals: BollingerSignalRow[];
    bollingerRsiThreshold: number;
    backtestDays: number;
    bollingerBacktest?: { rows: BollingerBacktestRow[]; signalDate: string; currentDate: string };
}

export default function SignalsContent({ snapshots, bollingerSignals, bollingerRsiThreshold, backtestDays, bollingerBacktest }: Props) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const currentSnapshot = searchParams.get('snapshot') || (snapshots.length > 0 ? snapshots[0].id : '');

    return (
        <div className="space-y-16">
            {/* Snapshot selector */}
            <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-slate-100 py-4">
                <div className="flex items-center gap-4 flex-wrap">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Snapshot</label>
                    <select
                        value={currentSnapshot}
                        onChange={(e) => {
                            const params = new URLSearchParams(window.location.search);
                            params.set('snapshot', e.target.value);
                            router.push(`/signals?${params.toString()}`);
                        }}
                        className="text-sm font-semibold text-slate-800 border border-slate-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-slate-400"
                    >
                        {snapshots.map((s) => (
                            <option key={s.id} value={s.id}>{s.label}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div>
                <div className="mb-6">
                    <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
                        Oversold Extremes
                        <span className="px-2 py-0.5 bg-rose-100 text-rose-700 text-[10px] font-bold rounded-full tracking-widest uppercase align-middle">Signals</span>
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
                                const params = new URLSearchParams(window.location.search);
                                params.set('bollingerRsi', String(val));
                                router.push(`/signals?${params.toString()}`);
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                            }}
                            className="w-16 text-center border border-slate-300 rounded-md px-2 py-0.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-rose-400"
                        />
                        <p className="text-slate-500 text-sm">and price outside the 20-period 2-SD Bollinger Bands.</p>
                    </div>
                </div>
                <BollingerSignals data={bollingerSignals} rsiThreshold={bollingerRsiThreshold} />
            </div>

            {bollingerBacktest && (
                <div className="pt-16 border-t border-slate-100 mt-16">
                    <div className="mb-6">
                        <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
                            Signal Backtest
                        </h2>
                        <div className="flex items-center gap-3 mt-2 flex-wrap">
                            <p className="text-slate-500 text-sm">Performance over</p>
                            <div className="flex gap-1">
                                {[1, 2, 3, 4, 5].map((d) => (
                                    <button
                                        key={d}
                                        onClick={() => {
                                            const params = new URLSearchParams(window.location.search);
                                            params.set('backtestDays', String(d));
                                            router.push(`/signals?${params.toString()}`);
                                        }}
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
                    <BollingerBacktest data={bollingerBacktest.rows} signalDate={bollingerBacktest.signalDate} currentDate={bollingerBacktest.currentDate} />
                </div>
            )}
        </div>
    );
}
