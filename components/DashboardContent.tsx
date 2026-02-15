'use client';

import { useState } from 'react';
import { IndustryApiResponse } from '@/types';
import PerformanceTable from './PerformanceTable';
import MomentumMatrix from './MomentumMatrix';
import MarketMonitor from './MarketMonitor';
import { LayoutGrid, Scale, Clock, History, ChevronDown, RefreshCw, Download } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { refreshMarketData } from '@/lib/finviz';
import { useTransition } from 'react';

interface Props {
    data: IndustryApiResponse;
    snapshots: { id: string; label: string; timestamp: number }[];
}

export default function DashboardContent({ data: { data, lastUpdated }, snapshots }: Props) {
    const [weighting, setWeighting] = useState<'weighted' | 'equal'>('weighted');
    const [isRefreshing, startRefresh] = useTransition();
    const router = useRouter();
    const searchParams = useSearchParams();
    const currentSnapshot = searchParams.get('snapshot') || 'live';

    // Get the date string for the download link
    const downloadId = currentSnapshot === 'live' && snapshots.length > 0
        ? snapshots[0].id
        : currentSnapshot;

    const handleRefresh = () => {
        startRefresh(async () => {
            await refreshMarketData();
            router.refresh();
        });
    };

    // Format date safely for client (handling hydration)
    const formattedDate = lastUpdated ? new Date(lastUpdated).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    }) : 'Never';

    // Transform data based on selection
    const displayData = data.map(item => ({
        ...item,
        week: weighting === 'equal' ? item.weekEqual : item.week,
        month: weighting === 'equal' ? item.monthEqual : item.month,
        momentum: weighting === 'equal' ? item.momentumEqual : item.momentum
    }));

    return (
        <div className="space-y-16">
            {/* Control Bar: Weighting & Snapshot History */}
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

                    {/* Snapshot History Selector */}
                    <div className="flex flex-col items-center gap-3">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Fetching Point</label>
                        <div className="flex items-center gap-4">
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                                    <History size={16} className="text-gray-400 group-hover:text-[#3D3DFF] transition-colors" />
                                </div>
                                <select
                                    value={currentSnapshot}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (val === 'live') router.push('/');
                                        else router.push(`/?snapshot=${val}`);
                                    }}
                                    className="pl-12 pr-10 py-3.5 bg-white border border-gray-100 rounded-2xl text-sm font-bold text-gray-700 shadow-xl shadow-gray-100/50 appearance-none cursor-pointer hover:border-blue-100 transition-all outline-none focus:ring-2 focus:ring-blue-50"
                                >
                                    <option value="live">Live / Latest Data</option>
                                    {snapshots.map(s => (
                                        <option key={s.id} value={s.id}>{s.label}</option>
                                    ))}
                                </select>
                                <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                                    <ChevronDown size={16} className="text-gray-400 group-hover:text-[#3D3DFF] transition-colors" />
                                </div>
                            </div>

                            {/* Download Button */}
                            {downloadId && downloadId !== 'live' && (
                                <a
                                    href={`/api/download/${downloadId}`}
                                    className="p-4 bg-white border border-gray-100 rounded-2xl text-gray-500 hover:text-[#3D3DFF] hover:border-blue-100 shadow-xl shadow-gray-100/50 transition-all flex items-center justify-center group shrink-0"
                                    title="Download Full Ticker Export (CSV)"
                                    download
                                >
                                    <Download size={20} className="group-hover:scale-110 transition-transform" />
                                </a>
                            )}

                            <button
                                onClick={handleRefresh}
                                disabled={isRefreshing}
                                className={`p-3.5 bg-white border border-gray-100 rounded-2xl shadow-xl shadow-gray-100/50 transition-all hover:bg-gray-50 flex items-center justify-center group ${isRefreshing ? 'opacity-50 cursor-not-allowed' : ''}`}
                                title="Refresh Data from Finviz"
                            >
                                <RefreshCw size={18} className={`text-[#3D3DFF] ${isRefreshing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
                            </button>
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

            {/* Momentum Matrix Visualization Section */}
            <div className="mt-16">
                <h2 className="text-3xl font-bold text-black mb-10 text-center">Momentum & Performance Visualization</h2>
                <MomentumMatrix data={displayData} />
            </div>

            {/* Market Monitor - High Level Overview */}
            <div className="mt-24">
                <MarketMonitor data={displayData} />
            </div>

            {/* Full Industry Breakdown Table */}
            <div className="pt-24 border-t border-gray-100 mt-24">
                <h2 className="text-4xl font-bold mb-10">Full Industry Breakdown</h2>
                <PerformanceTable data={displayData} />
            </div>

            {/* Decorative element moved inside the container for better positioning */}
            <div className="opacity-10 pointer-events-none select-none fixed bottom-10 left-10 -z-10">
                <svg width="400" height="400" viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M50 350C100 300 150 250 200 250C250 250 300 300 350 350" stroke="#3D3DFF" strokeWidth="1" strokeDasharray="4 4" />
                    <path d="M50 320C100 270 150 220 200 220C250 220 300 270 350 320" stroke="#3D3DFF" strokeWidth="1" strokeDasharray="4 4" />
                    <path d="M50 290C100 240 150 190 200 190C250 190 300 240 350 290" stroke="#3D3DFF" strokeWidth="1" strokeDasharray="4 4" />
                </svg>
            </div>
        </div>
    );
}
