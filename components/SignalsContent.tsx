'use client';

import { useMemo, useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import BollingerSignals from './BollingerSignals';
import { BollingerSignalRow } from '@/types';
import { ChevronDown, Check } from 'lucide-react';

interface Props {
    snapshots: { id: string; label: string; timestamp: number }[];
    bollingerSignals: BollingerSignalRow[];
    bollingerRsiThreshold: number;
    lookbackDays: number;
}

export default function SignalsContent({ snapshots, bollingerSignals, bollingerRsiThreshold, lookbackDays }: Props) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const currentSnapshot = searchParams.get('snapshot') || (snapshots.length > 0 ? snapshots[0].id : '');
    const currentSectorParam = searchParams.get('sector');
    const selectedSectors = currentSectorParam ? currentSectorParam.split(',') : [];

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
        const unique = [...new Set(bollingerSignals.map(r => r.sector))].sort();
        return unique;
    }, [bollingerSignals]);

    const filteredSignals = useMemo(() => {
        if (selectedSectors.length === 0) return bollingerSignals;
        return bollingerSignals.filter(r => selectedSectors.includes(r.sector));
    }, [bollingerSignals, selectedSectors]);

    const updateParam = (key: string, value: string) => {
        const params = new URLSearchParams(window.location.search);
        if (value === 'all' && key === 'sector') {
            params.delete('sector');
        } else {
            params.set(key, value);
        }
        router.push(`/signals?${params.toString()}`);
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
        router.push(`/signals?${params.toString()}`);
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
                                updateParam('bollingerRsi', String(val));
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                            }}
                            className="w-16 text-center border border-slate-300 rounded-md px-2 py-0.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-rose-400"
                        />
                        <p className="text-slate-500 text-sm">and price outside Bollinger Bands in the last</p>
                        <select
                            value={lookbackDays}
                            onChange={(e) => updateParam('lookbackDays', e.target.value)}
                            className="text-sm font-semibold text-slate-800 border border-slate-300 rounded-md px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-rose-400"
                        >
                            {[1, 2, 3, 5, 10].map((d) => (
                                <option key={d} value={d}>{d} {d === 1 ? 'day' : 'days'}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <BollingerSignals data={filteredSignals} rsiThreshold={bollingerRsiThreshold} showSignalDate={lookbackDays > 1} />
            </div>
        </div>
    );
}
