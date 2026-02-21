'use client';

import { Scale, LayoutGrid, Briefcase, PieChart, Filter, BarChart2, ChevronDown, History, Clock } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

interface Props {
    weighting: 'weighted' | 'equal';
    setWeighting: (w: 'weighted' | 'equal') => void;
    showStrongOnly: false | true;
    setShowStrongOnly: (s: boolean) => void;
    currentSnapshot: string;
    groupBy: string;
    currentSector: string;
    currentIndustry: string;
    yAxis: string;
    sectors: string[];
    industries: string[];
    snapshots: { id: string; label: string; timestamp: number }[];
    formattedDate: string;
}

export default function ControlBar({
    weighting,
    setWeighting,
    showStrongOnly,
    setShowStrongOnly,
    currentSnapshot,
    groupBy,
    currentSector,
    currentIndustry,
    yAxis,
    sectors,
    industries,
    snapshots,
    formattedDate
}: Props) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const updateParams = (updates: Record<string, string | null>) => {
        const params = new URLSearchParams(searchParams.toString());
        Object.entries(updates).forEach(([key, value]) => {
            if (value === null) params.delete(key);
            else params.set(key, value);
        });
        router.push(`/?${params.toString()}`);
    };

    return (
        <div className="flex flex-col items-center justify-center gap-8 py-8">
            <div className="flex flex-wrap items-center justify-center gap-10">
                {/* Performance Model Toggle */}
                <div className="flex flex-col items-center gap-3">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Performance Model</label>
                    <div className="bg-white p-1 rounded-2xl flex items-center gap-1 border border-gray-100 shadow-xl shadow-gray-100/50">
                        <button
                            onClick={() => setWeighting('weighted')}
                            className={`px-8 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2.5 ${weighting === 'weighted'
                                ? 'bg-[#3D3DFF] text-white shadow-lg shadow-blue-100'
                                : 'text-gray-500 hover:bg-gray-50'
                                }`}
                        >
                            <Scale size={18} />
                            Market-Cap
                        </button>
                        <button
                            onClick={() => setWeighting('equal')}
                            className={`px-8 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2.5 ${weighting === 'equal'
                                ? 'bg-[#3D3DFF] text-white shadow-lg shadow-blue-100'
                                : 'text-gray-500 hover:bg-gray-50'
                                }`}
                        >
                            <LayoutGrid size={18} />
                            Equal Weight
                        </button>
                    </div>
                </div>

                {/* Grouping Toggle (Industry vs Sector) */}
                <div className="flex flex-col items-center gap-3">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Grouping</label>
                    <div className="bg-white p-1 rounded-2xl flex items-center gap-1 border border-gray-100 shadow-xl shadow-gray-100/50">
                        <button
                            onClick={() => updateParams({ groupBy: 'industry' })}
                            className={`px-8 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2.5 ${groupBy === 'industry'
                                ? 'bg-[#3D3DFF] text-white shadow-lg shadow-blue-100'
                                : 'text-gray-500 hover:bg-gray-50'
                                }`}
                        >
                            <Briefcase size={18} />
                            Industry
                        </button>
                        <button
                            onClick={() => updateParams({ groupBy: 'sector', sector: null, industry: null })}
                            className={`px-8 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2.5 ${groupBy === 'sector'
                                ? 'bg-[#3D3DFF] text-white shadow-lg shadow-blue-100'
                                : 'text-gray-500 hover:bg-gray-50'
                                }`}
                        >
                            <PieChart size={18} />
                            Sector
                        </button>
                        <button
                            onClick={() => updateParams({ groupBy: 'ticker' })}
                            className={`px-8 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2.5 ${groupBy === 'ticker'
                                ? 'bg-[#3D3DFF] text-white shadow-lg shadow-blue-100'
                                : 'text-gray-500 hover:bg-gray-50'
                                }`}
                        >
                            <BarChart2 size={18} />
                            Stocks
                        </button>
                    </div>
                </div>

                {/* Sector Filter */}
                {(groupBy === 'industry' || groupBy === 'ticker') && (
                    <div className="flex flex-col items-center gap-3 animate-in fade-in zoom-in duration-300">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Filter Sector</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                                <Filter size={16} className="text-gray-400 group-hover:text-[#3D3DFF] transition-colors" />
                            </div>
                            <select
                                value={currentSector}
                                onChange={(e) => updateParams({ sector: e.target.value === 'all' ? null : e.target.value, industry: null })}
                                className="pl-12 pr-10 py-3.5 bg-white border border-gray-100 rounded-2xl text-sm font-bold text-gray-700 shadow-xl shadow-gray-100/50 appearance-none cursor-pointer hover:border-blue-100 transition-all outline-none focus:ring-2 focus:ring-blue-50 max-w-[200px]"
                            >
                                <option value="all">All Sectors</option>
                                {sectors.map(s => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                            <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                                <ChevronDown size={16} className="text-gray-400 group-hover:text-[#3D3DFF] transition-colors" />
                            </div>
                        </div>
                    </div>
                )}

                {/* Industry Filter (Drill-down) */}
                {groupBy === 'ticker' && (
                    <div className="flex flex-col items-center gap-3 animate-in fade-in zoom-in duration-300">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Filter Industry</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                                <Filter size={16} className="text-gray-400 group-hover:text-[#3D3DFF] transition-colors" />
                            </div>
                            <select
                                value={currentIndustry}
                                onChange={(e) => updateParams({ industry: e.target.value === 'all' ? null : e.target.value })}
                                className="pl-12 pr-10 py-3.5 bg-white border border-gray-100 rounded-2xl text-sm font-bold text-gray-700 shadow-xl shadow-gray-100/50 appearance-none cursor-pointer hover:border-blue-100 transition-all outline-none focus:ring-2 focus:ring-blue-50 max-w-[200px]"
                            >
                                <option value="all">All Industries</option>
                                {industries.map(i => (
                                    <option key={i} value={i}>{i}</option>
                                ))}
                            </select>
                            <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                                <ChevronDown size={16} className="text-gray-400 group-hover:text-[#3D3DFF] transition-colors" />
                            </div>
                        </div>
                    </div>
                )}

                {/* Y-Axis Metric */}
                <div className="flex flex-col items-center gap-3">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Y-Axis Metric</label>
                    <div className="bg-white p-1 rounded-2xl flex items-center gap-1 border border-gray-100 shadow-xl shadow-gray-100/50">
                        <button
                            onClick={() => updateParams({ yAxis: null })}
                            className={`px-6 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2.5 ${yAxis === 'week'
                                ? 'bg-[#3D3DFF] text-white shadow-lg shadow-blue-100'
                                : 'text-gray-500 hover:bg-gray-50'
                                }`}
                        >
                            <BarChart2 size={18} />
                            Performance
                        </button>
                        <button
                            onClick={() => updateParams({ yAxis: 'rsi' })}
                            className={`px-6 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2.5 ${yAxis === 'rsi'
                                ? 'bg-[#3D3DFF] text-white shadow-lg shadow-blue-100'
                                : 'text-gray-500 hover:bg-gray-50'
                                }`}
                        >
                            <span className="font-black text-xs">RSI</span>
                            RSI
                        </button>
                    </div>
                </div>

                {/* Momentum Filter */}
                <div className="flex flex-col items-center gap-3">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Momentum Filter</label>
                    <div className="bg-white p-1 rounded-2xl flex items-center gap-1 border border-gray-100 shadow-xl shadow-gray-100/50">
                        <button
                            onClick={() => setShowStrongOnly(!showStrongOnly)}
                            className={`px-6 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2.5 ${showStrongOnly
                                ? 'bg-[#3D3DFF] text-white shadow-lg shadow-blue-100'
                                : 'text-gray-500 hover:bg-gray-50'
                                }`}
                        >
                            <Scale size={18} />
                            {showStrongOnly ? 'Strong Only' : 'Show All'}
                        </button>
                    </div>
                </div>

                {/* Snapshot Selector (Multi-select) */}
                <div className="flex flex-col items-center gap-3">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Trajectory Points (Max 5)</label>
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                            <History size={16} className="text-gray-400 group-hover:text-[#3D3DFF] transition-colors" />
                        </div>
                        <div className="flex flex-wrap gap-1 p-1 bg-white border border-gray-100 rounded-2xl shadow-xl shadow-gray-100/50 min-w-[200px] max-w-[400px]">
                            {/* Live/Default Option */}
                            <button
                                onClick={() => {
                                    const ids = currentSnapshot.split(',');
                                    const newIds = ids.includes('live')
                                        ? (ids.length > 1 ? ids.filter(id => id !== 'live') : ['live'])
                                        : (ids.length < 5 ? [...ids, 'live'] : ids);
                                    updateParams({ snapshot: newIds.join(',') === 'live' ? null : newIds.sort().join(',') });
                                }}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${currentSnapshot.split(',').includes('live')
                                    ? 'bg-[#3D3DFF] text-white'
                                    : 'text-gray-500 hover:bg-gray-50'
                                    }`}
                            >
                                Live
                            </button>
                            {/* Historical Snapshots */}
                            {snapshots.slice(0, 10).map(s => (
                                <button
                                    key={s.id}
                                    onClick={() => {
                                        const ids = currentSnapshot.split(',');
                                        let newIds;
                                        if (ids.includes(s.id)) {
                                            newIds = ids.filter(id => id !== s.id);
                                            if (newIds.length === 0) newIds = ['live'];
                                        } else {
                                            if (ids.length >= 5) return;
                                            newIds = [...ids, s.id];
                                        }
                                        updateParams({ snapshot: newIds.join(',') === 'live' ? null : newIds.sort().join(',') });
                                    }}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${currentSnapshot.split(',').includes(s.id)
                                        ? 'bg-[#3D3DFF] text-white'
                                        : 'text-gray-500 hover:bg-gray-50'
                                        }`}
                                >
                                    {s.label.split(',')[0]} {/* Short date */}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-6 py-2 px-6 bg-[#3D3DFF]/5 rounded-full border border-[#3D3DFF]/10 group">
                <div className="flex items-center gap-2 text-[11px] font-bold text-[#3D3DFF] transition-colors">
                    <Clock size={14} className="opacity-70" />
                    <span>State: <span className="font-black tracking-tight uppercase">{currentSnapshot === 'live' ? 'Real-time' : 'Historical Snapshot'}</span></span>
                </div>
                <div className="w-[1px] h-3 bg-[#3D3DFF]/20" />
                <div className="text-[11px] text-[#3D3DFF] font-bold tracking-tight">
                    Updated: {formattedDate}
                </div>
            </div>
        </div>
    );
}
