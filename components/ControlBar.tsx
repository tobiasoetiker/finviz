'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Scale, LayoutGrid, Briefcase, PieChart, Filter, BarChart2, ChevronDown, History, Clock, Check, LineChart } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

interface Props {
    weighting: 'weighted' | 'equal';
    setWeighting: (w: 'weighted' | 'equal') => void;
    momentumFocus: 'all' | 'top10_momentum' | 'top10_performance';
    setMomentumFocus: (s: 'all' | 'top10_momentum' | 'top10_performance') => void;
    currentSnapshot: string;
    groupBy: string;
    currentSector: string;
    currentIndustry: string;
    yAxis: string;
    sectors: string[];
    industries: string[];
    snapshots: { id: string; label: string; timestamp: number }[];
    formattedDate: string;
    rsiRange: [number, number];
    setRsiRange: (range: [number, number]) => void;
}

const ControlGroup = ({ label, children }: { label: string, children: React.ReactNode }) => (
    <div className="flex flex-col gap-2 flex-grow sm:flex-grow-0">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">{label}</label>
        {children}
    </div>
);

const SegmentedControl = ({
    options,
    value,
    onChange
}: {
    options: { label: string, value: string, icon: React.ReactNode }[],
    value: string,
    onChange: (v: string) => void
}) => {
    return (
        <div className="flex bg-slate-100 p-1 rounded-xl items-center relative h-[42px] min-w-max">
            {options.map(opt => {
                const isActive = value === opt.value;
                return (
                    <button
                        key={opt.value}
                        onClick={() => onChange(opt.value)}
                        className={`relative z-10 flex flex-1 items-center justify-center gap-2 px-4 py-1.5 text-xs font-bold rounded-lg transition-all duration-200 ${isActive
                            ? 'bg-white text-blue-600 shadow-sm ring-1 ring-slate-200/50'
                            : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
                            }`}
                    >
                        {opt.icon}
                        {opt.label}
                    </button>
                );
            })}
        </div>
    );
};

export default function ControlBar({
    weighting,
    setWeighting,
    momentumFocus,
    setMomentumFocus,
    currentSnapshot,
    groupBy,
    currentSector,
    currentIndustry,
    yAxis,
    sectors,
    industries,
    snapshots,
    formattedDate,
    rsiRange,
    setRsiRange
}: Props) {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Dropdown state and click-outside logic
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [dropdownRef]);

    const updateParams = (updates: Record<string, string | null>) => {
        const params = new URLSearchParams(searchParams.toString());
        Object.entries(updates).forEach(([key, value]) => {
            if (value === null) params.delete(key);
            else params.set(key, value);
        });
        router.push(`/?${params.toString()}`);
    };

    const handleSnapshotToggle = (id: string) => {
        const ids = currentSnapshot.split(',');
        let newIds;

        if (ids.includes(id)) {
            newIds = ids.filter(i => i !== id);
            if (newIds.length === 0) newIds = [snapshots.length > 0 ? snapshots[0].id : ''];
        } else {
            if (ids.length >= 5) return; // Enforce max 5 points for sanity
            newIds = [...ids, id];
        }

        updateParams({ snapshot: newIds.sort().join(',') });
    };

    const selectedSnapshots = currentSnapshot.split(',');

    return (
        <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/80 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] w-full py-4 pb-5 px-6 md:px-12 -mx-0">
            <div className="max-w-[1600px] mx-auto flex flex-col gap-5">

                {/* Top Row: Macro Settings & Synchronization */}
                <div className="flex flex-wrap items-end justify-between gap-6">
                    <div className="flex flex-wrap items-end gap-x-6 gap-y-5">
                        <ControlGroup label="Hierarchical Grouping">
                            <SegmentedControl
                                value={groupBy}
                                onChange={(val) => {
                                    if (val === 'sector') updateParams({ groupBy: null, sector: null, industry: null });
                                    else if (val === 'industry') updateParams({ groupBy: 'industry', industry: null });
                                    else updateParams({ groupBy: 'ticker' });
                                }}
                                options={[
                                    { value: 'sector', label: 'Sector', icon: <PieChart size={14} /> },
                                    { value: 'industry', label: 'Industry', icon: <Briefcase size={14} /> },
                                    { value: 'ticker', label: 'Stocks', icon: <BarChart2 size={14} /> }
                                ]}
                            />
                        </ControlGroup>

                        <ControlGroup label="Performance Weighting">
                            <SegmentedControl
                                value={weighting}
                                onChange={(val) => setWeighting(val as 'weighted' | 'equal')}
                                options={[
                                    { value: 'weighted', label: 'Market-Cap', icon: <Scale size={14} /> },
                                    { value: 'equal', label: 'Equal Weight', icon: <LayoutGrid size={14} /> }
                                ]}
                            />
                        </ControlGroup>

                        <ControlGroup label="Y-Axis Metric">
                            <SegmentedControl
                                value={yAxis}
                                onChange={(val) => updateParams({ yAxis: val === 'week' ? null : val })}
                                options={[
                                    { value: 'week', label: 'Performance', icon: <BarChart2 size={14} /> },
                                    { value: 'rsi', label: 'RSI (14)', icon: <span className="font-black text-[10px]">RSI</span> }
                                ]}
                            />
                        </ControlGroup>

                        <ControlGroup label="Focus Highlights">
                            <SegmentedControl
                                value={momentumFocus}
                                onChange={(val) => setMomentumFocus(val as any)}
                                options={[
                                    { value: 'all', label: 'Show All', icon: <LineChart size={14} /> },
                                    { value: 'top10_momentum', label: 'Top 10 Momentum', icon: <Scale size={14} /> },
                                    { value: 'top10_performance', label: 'Top 10 Performance', icon: <Briefcase size={14} /> }
                                ]}
                            />
                        </ControlGroup>

                        <ControlGroup label="RSI Filter (14)">
                            <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl h-[42px]">
                                <div className="flex items-center gap-1.5 px-3">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">From</span>
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={rsiRange[0]}
                                        onChange={(e) => setRsiRange([parseInt(e.target.value) || 0, rsiRange[1]])}
                                        className="w-12 bg-white border border-slate-200 rounded-lg py-1 px-1.5 text-xs font-bold text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                    />
                                </div>
                                <div className="w-px h-4 bg-slate-200" />
                                <div className="flex items-center gap-1.5 px-3">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">To</span>
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={rsiRange[1]}
                                        onChange={(e) => setRsiRange([rsiRange[0], parseInt(e.target.value) || 0])}
                                        className="w-12 bg-white border border-slate-200 rounded-lg py-1 px-1.5 text-xs font-bold text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                    />
                                </div>
                            </div>
                        </ControlGroup>
                    </div>

                </div>

                {/* Bottom Row: Context & Time Trajectories */}
                <div className="flex flex-wrap items-end gap-6 pt-5 border-t border-slate-100/80">
                    <ControlGroup label="Time Travel (Trajectories)">
                        <div className="relative" ref={dropdownRef}>
                            <button
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                className={`flex items-center justify-between gap-3 px-4 py-0 h-[42px] bg-white border rounded-xl text-sm font-bold shadow-sm transition-all min-w-[280px] ${isDropdownOpen
                                    ? 'border-blue-400 ring-4 ring-blue-50'
                                    : 'border-slate-200 hover:border-slate-300'
                                    }`}
                            >
                                <div className="flex items-center gap-2">
                                    <History size={16} className={selectedSnapshots.length > 1 ? 'text-blue-600' : 'text-slate-400'} />
                                    <span className="text-slate-700">
                                        {selectedSnapshots.length === 1
                                            ? `${snapshots.find(s => s.id === selectedSnapshots[0])?.label.split(',')[0] || selectedSnapshots[0]}`
                                            : `${selectedSnapshots.length} Point${selectedSnapshots.length > 1 ? 's' : ''} Selected`}
                                    </span>
                                </div>
                                <ChevronDown size={16} className={`text-slate-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {isDropdownOpen && (
                                <div className="absolute top-[calc(100%+8px)] left-0 w-80 bg-white border border-slate-200 shadow-2xl rounded-2xl py-2 z-50 max-h-96 overflow-y-auto">
                                    <div className="px-4 pb-2 mb-2 border-b border-slate-100">
                                        <p className="text-xs text-slate-500 font-semibold leading-relaxed text-center">Select up to 5 historical points to map trajectories over time.</p>
                                    </div>



                                    {snapshots.map(s => {
                                        const isSelected = selectedSnapshots.includes(s.id);
                                        const isDisabled = !isSelected && selectedSnapshots.length >= 5;

                                        return (
                                            <label key={s.id} className={`flex items-center gap-3 px-4 py-2 transition-colors group ${isDisabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-slate-50 cursor-pointer'}`}>
                                                <div className="relative flex items-center justify-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        disabled={isDisabled}
                                                        onChange={() => handleSnapshotToggle(s.id)}
                                                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer appearance-none peer bg-white"
                                                    />
                                                    <div className={`absolute inset-0 border rounded flex items-center justify-center pointer-events-none transition-colors ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-slate-300 bg-white'}`}>
                                                        {isSelected && <Check size={12} className="text-white" strokeWidth={3} />}
                                                    </div>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className={`text-sm font-semibold transition-colors ${isSelected ? 'text-slate-900 group-hover:text-blue-600' : 'text-slate-600 group-hover:text-slate-900'}`}>
                                                        {s.label.split(',')[0]}
                                                    </span>
                                                </div>
                                            </label>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </ControlGroup>

                    {(groupBy === 'industry' || groupBy === 'ticker') && (
                        <ControlGroup label="Filter Sector">
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                    <Filter size={16} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
                                </div>
                                <select
                                    value={currentSector}
                                    onChange={(e) => updateParams({ sector: e.target.value === 'all' ? null : e.target.value, industry: null })}
                                    className="pl-9 pr-10 py-0 h-[42px] bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 shadow-sm appearance-none cursor-pointer hover:border-slate-300 transition-all outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-400 min-w-[200px]"
                                >
                                    <option value="all">All Sectors</option>
                                    {sectors.map(s => (
                                        <option key={s} value={s}>{s}</option>
                                    ))}
                                </select>
                                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                                    <ChevronDown size={16} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
                                </div>
                            </div>
                        </ControlGroup>
                    )}

                    {(groupBy === 'industry' || groupBy === 'ticker') && (
                        <ControlGroup label="Filter Industry">
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                    <Filter size={16} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
                                </div>
                                <select
                                    value={currentIndustry}
                                    onChange={(e) => updateParams({ industry: e.target.value === 'all' ? null : e.target.value })}
                                    className="pl-9 pr-10 py-0 h-[42px] bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 shadow-sm appearance-none cursor-pointer hover:border-slate-300 transition-all outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-400 min-w-[240px]"
                                >
                                    <option value="all">All Industries</option>
                                    {industries.map(i => (
                                        <option key={i} value={i}>{i}</option>
                                    ))}
                                </select>
                                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                                    <ChevronDown size={16} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
                                </div>
                            </div>
                        </ControlGroup>
                    )}
                </div>
            </div>
        </div>
    );
}
