'use client';

import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { IndustryApiResponse, PerformanceTimeFrame, MomentumPreset } from '@/types';
import { refreshMarketData } from '@/lib/finviz';
import PerformanceTable from './PerformanceTable';
import MomentumMatrix from './MomentumMatrix';
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
    const [momentumFocus, setMomentumFocus] = useState<'all' | 'top10_momentum' | 'top10_performance'>('all');
    const [performanceTimeFrame, setPerformanceTimeFrame] = useState<PerformanceTimeFrame>('week');
    const [momentumPreset, setMomentumPreset] = useState<MomentumPreset>('weekly');
    const [rsiRange, setRsiRange] = useState<[number, number]>([0, 100]);
    const [isRefreshing, startRefresh] = useTransition();
    const router = useRouter();
    const searchParams = useSearchParams();

    const currentSnapshot = searchParams.get('snapshot') || (snapshots.length > 0 ? snapshots[0].id : '');
    const groupBy = searchParams.get('groupBy') || 'sector';
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

    // Performance time frame labels for display
    const perfLabel: Record<PerformanceTimeFrame, string> = {
        change: 'Daily', week: '1 Week', month: '1 Month', quarter: '1 Quarter'
    };
    const momentumLabel: Record<MomentumPreset, string> = {
        daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly'
    };

    // Transform data based on selection
    let displayData = data.map(item => {
        const w = weighting === 'equal';
        const change = w ? item.change : item.change; // change has no equal variant in current data
        const week = w ? item.weekEqual : item.week;
        const month = w ? item.monthEqual : item.month;
        const quarter = w ? item.quarterEqual : item.quarter;
        const rsi = w ? item.rsiEqual : item.rsi;

        // Compute momentum based on preset
        let momentum: number;
        switch (momentumPreset) {
            case 'daily':  momentum = change - (week / 5); break;
            case 'weekly': momentum = week - (month / 4); break;
            case 'monthly': momentum = month - (quarter / 3); break;
        }

        // Map performanceTimeFrame to the correct value for the performance axis
        const perfMap: Record<PerformanceTimeFrame, number> = { change, week, month, quarter };
        const perfValue = perfMap[performanceTimeFrame];

        return {
            ...item,
            change: item.change,
            week: perfValue,
            month: w ? item.monthEqual : item.month,
            quarter: w ? item.quarterEqual : item.quarter,
            momentum,
            rsi,
        };
    });

    // Apply RSI Filtering
    displayData = displayData.filter(item => {
        const rsiVal = item.rsi || 0;
        return rsiVal >= rsiRange[0] && rsiVal <= rsiRange[1];
    });

    if (momentumFocus === 'top10_momentum') {
        displayData = [...displayData].sort((a, b) => b.momentum - a.momentum).slice(0, 10);
    } else if (momentumFocus === 'top10_performance') {
        // Top performance = highest weekly return
        displayData = [...displayData].sort((a, b) => b.week - a.week).slice(0, 10);
    }

    return (
        <div className="space-y-16">
            <ControlBar
                weighting={weighting}
                setWeighting={setWeighting}
                momentumFocus={momentumFocus}
                setMomentumFocus={setMomentumFocus}
                performanceTimeFrame={performanceTimeFrame}
                setPerformanceTimeFrame={setPerformanceTimeFrame}
                momentumPreset={momentumPreset}
                setMomentumPreset={setMomentumPreset}
                currentSnapshot={currentSnapshot}
                groupBy={groupBy}
                currentSector={currentSector}
                currentIndustry={searchParams.get('industry') || 'all'}
                yAxis={yAxis}
                sectors={sectors}
                industries={industries}
                snapshots={snapshots}
                formattedDate={formattedDate}
                rsiRange={rsiRange}
                setRsiRange={setRsiRange}
            />

            {/* Momentum Matrix Visualization Section */}
            <div className="mt-16">
                <h2 className="text-3xl font-bold text-black mb-10 text-center">Momentum & Performance Visualization</h2>
                <MomentumMatrix
                    data={displayData}
                    multiSnapshotData={multiSnapshotData}
                    weighting={weighting}
                    groupBy={groupBy as 'industry' | 'sector' | 'ticker'}
                    yAxis={yAxis as 'week' | 'rsi'}
                    performanceLabel={perfLabel[performanceTimeFrame]}
                    momentumPreset={momentumPreset}
                    momentumLabel={momentumLabel[momentumPreset]}
                />
            </div>

            {/* Full Breakdown Table */}
            <div className="pt-24 border-t border-slate-100 mt-24">
                <h2 className="text-4xl font-bold mb-10 text-slate-900 tracking-tight">
                    Full {groupBy === 'ticker' ? 'Stock' : (groupBy === 'sector' ? 'Sector' : 'Industry')} Breakdown
                </h2>
                <PerformanceTable
                    data={displayData}
                    title={groupBy === 'ticker' ? 'Stock Performance' : (groupBy === 'sector' ? 'Sector Performance' : 'Industry Performance')}
                    groupBy={groupBy as string}
                    performanceLabel={perfLabel[performanceTimeFrame]}
                    momentumLabel={momentumLabel[momentumPreset]}
                />
            </div>

        </div>
    );
}
