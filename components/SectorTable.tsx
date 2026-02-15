'use client';

import { SectorData } from '@/types';
import { useState } from 'react';

interface Props {
    data: SectorData;
}

type SortKey = 'name' | 'week' | 'month' | 'momentum';

export default function SectorTable({ data }: Props) {
    const [sortKey, setSortKey] = useState<SortKey>('momentum');
    const [sortDesc, setSortDesc] = useState(true);

    const sortedData = [...data].sort((a, b) => {
        const valA = a[sortKey];
        const valB = b[sortKey];

        if (typeof valA === 'string' && typeof valB === 'string') {
            return sortDesc ? valB.localeCompare(valA) : valA.localeCompare(valB);
        }

        return sortDesc ? (valB as number) - (valA as number) : (valA as number) - (valB as number);
    });

    const handleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDesc(!sortDesc);
        } else {
            setSortKey(key);
            setSortDesc(true);
        }
    };

    const formatPercent = (val: number) => `${val > 0 ? '+' : ''}${val.toFixed(2)}%`;
    const getColor = (val: number) => val > 0 ? 'text-green-600 dark:text-green-400' : val < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-500';

    return (
        <div className="overflow-x-auto rounded-lg shadow border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                    <tr>
                        <th scope="col" className="px-6 py-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600" onClick={() => handleSort('name')}>
                            Sector {sortKey === 'name' && (sortDesc ? '↓' : '↑')}
                        </th>
                        <th scope="col" className="px-6 py-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600" onClick={() => handleSort('week')}>
                            1 Week {sortKey === 'week' && (sortDesc ? '↓' : '↑')}
                        </th>
                        <th scope="col" className="px-6 py-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600" onClick={() => handleSort('month')}>
                            1 Month {sortKey === 'month' && (sortDesc ? '↓' : '↑')}
                        </th>
                        <th scope="col" className="px-6 py-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 bg-blue-50 dark:bg-gray-600" onClick={() => handleSort('momentum')}>
                            Momentum (W-M) {sortKey === 'momentum' && (sortDesc ? '↓' : '↑')}
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {sortedData.map((sector) => (
                        <tr key={sector.name} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                            <th scope="row" className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                                {sector.name}
                            </th>
                            <td className={`px-6 py-4 font-bold ${getColor(sector.week)}`}>
                                {formatPercent(sector.week)}
                            </td>
                            <td className={`px-6 py-4 font-bold ${getColor(sector.month)}`}>
                                {formatPercent(sector.month)}
                            </td>
                            <td className={`px-6 py-4 font-bold ${getColor(sector.momentum)} bg-blue-50/50 dark:bg-gray-700/50`}>
                                {formatPercent(sector.momentum)}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
