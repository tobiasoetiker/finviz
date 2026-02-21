'use client';

import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { IndustryApiResponse } from '@/types';
import { refreshMarketData } from '@/lib/finviz';
import PerformanceTable from './PerformanceTable';
import MomentumMatrix from './MomentumMatrix';
import MarketMonitor from './MarketMonitor';
import ControlBar from './ControlBar';

interface Props {
    data: IndustryApiResponse;
    multiSnapshotData?: Record<string, IndustryApiResponse>;
    snapshots: { id: string; label: string; timestamp: number }[];
    sectors?: string[];
    industries?: string[];
    yAxis?: string;
}

export default function DashboardContent({ data: { data, lastUpdated }, multiSnapshotData, snapshots, sectors = [], industries = [], yAxis: initialYAxis }: Props) {
    const [weighting, setWeighting] = useState<'weighted' | 'equal'>('weighted');
    const [showStrongOnly, setShowStrongOnly] = useState(false);
    const [isRefreshing, startRefresh] = useTransition();
    const router = useRouter();
    const searchParams = useSearchParams();

    const currentSnapshot = searchParams.get('snapshot') || 'live';
    const groupBy = searchParams.get('groupBy') || 'industry';
    const currentSector = searchParams.get('sector') || 'all';
    const yAxis = searchParams.get('yAxis') || initialYAxis || 'week';

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
        momentum: weighting === 'equal' ? item.momentumEqual : item.momentum,
        rsi: weighting === 'equal' ? (item as any).rsiEqual : (item as any).rsi
    }));

    return (
        <div className="space-y-16">
            <ControlBar
                weighting={weighting}
                setWeighting={setWeighting}
                showStrongOnly={showStrongOnly}
                setShowStrongOnly={setShowStrongOnly}
                currentSnapshot={currentSnapshot}
                groupBy={groupBy}
                currentSector={currentSector}
                currentIndustry={searchParams.get('industry') || 'all'}
                yAxis={yAxis}
                sectors={sectors}
                industries={industries}
                snapshots={snapshots}
                formattedDate={formattedDate}
            />

            {/* Momentum Matrix Visualization Section */}
            <div className="mt-16">
                <h2 className="text-3xl font-bold text-black mb-10 text-center">Momentum & Performance Visualization</h2>
                <MomentumMatrix
                    data={showStrongOnly ? displayData.filter(d => d.momentum > 0) : displayData}
                    multiSnapshotData={multiSnapshotData}
                    weighting={weighting}
                    groupBy={groupBy as 'industry' | 'sector' | 'ticker'}
                    yAxis={yAxis as 'week' | 'rsi'}
                />
            </div>

            {/* Full Industry Breakdown Table */}
            <div className="pt-24 border-t border-gray-100 mt-24">
                <h2 className="text-4xl font-bold mb-10">Full {groupBy === 'sector' ? 'Sector' : 'Industry'} Breakdown</h2>
                <PerformanceTable data={displayData} title={groupBy === 'sector' ? 'Sector Performance' : 'Industry Performance'} />
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
