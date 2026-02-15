'use client';

import { GroupPerformance } from '@/types';
import Link from 'next/link';

interface Props {
    data: GroupPerformance[];
}

export default function MarketMonitor({ data }: Props) {
    // We'll use the industry data to fill the "Market Monitor" table
    // Top 10 industries by market cap for the "Market Monitor" view
    const top10 = [...data]
        .sort((a, b) => b.marketCap - a.marketCap)
        .slice(0, 10);

    const formatPill = (val: number | null | undefined) => {
        if (val === null || val === undefined) {
            return (
                <span className="bg-gray-100 text-gray-400 px-3 py-1 rounded-md text-xs font-bold inline-block min-w-[60px] text-center">
                    -
                </span>
            );
        }
        const isPositive = val >= 0;
        const bg = isPositive ? 'bg-[#C6F6D5]' : 'bg-[#FED7D7]';
        const text = isPositive ? 'text-[#22543D]' : 'text-[#822727]';
        return (
            <span className={`${bg} ${text} px-3 py-1 rounded-md text-xs font-bold inline-block min-w-[60px] text-center`}>
                {isPositive ? '+' : ''}{val.toFixed(2)}%
            </span>
        );
    };

    return (
        <div className="bg-white border border-gray-100 rounded-2xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] w-full">
            <div className="flex justify-between items-center mb-10">
                <div className="flex items-center gap-3">
                    <div className="pulsing-live"></div>
                    <span className="text-xs font-bold uppercase tracking-widest text-[#666]">Live</span>
                </div>
                <Link href="#" className="text-sm font-bold text-pv-blue flex items-center gap-1 group">
                    Open Market Dashboard
                    <span className="group-hover:translate-x-1 transition-transform">»</span>
                </Link>
            </div>

            <h3 className="text-2xl font-bold text-black mb-8">Market Monitor - Industry Performance</h3>

            <div className="w-full">
                <table className="w-full text-left">
                    <thead>
                        <tr className="text-[11px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50">
                            <th className="pb-4">Industry</th>
                            <th className="pb-4 text-center">Week</th>
                            <th className="pb-4 text-center">Month</th>
                            <th className="pb-4 text-center">Momentum</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {top10.map((item) => (
                            <tr key={item.name} className="group hover:bg-gray-50 transition-colors">
                                <td className="py-4 text-[13px] font-medium text-[#444] border-r border-gray-50 pr-4">
                                    <span className="cursor-pointer hover:underline decoration-pv-blue decoration-2 underline-offset-4">
                                        {item.name}
                                    </span>
                                </td>
                                <td className="py-4 text-center px-4">
                                    {formatPill(item.week)}
                                </td>
                                <td className="py-4 text-center px-4 border-l border-r border-gray-50">
                                    {formatPill(item.month)}
                                </td>
                                <td className="py-4 text-center px-4">
                                    {formatPill(item.momentum)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
