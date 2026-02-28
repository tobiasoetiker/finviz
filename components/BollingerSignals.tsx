import { BollingerSignalRow } from '@/types';

export default function BollingerSignals({ data }: { data: BollingerSignalRow[] }) {
    if (!data || data.length === 0) {
        return (
            <div className="py-10 text-center text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                <p>No stocks currently meet the RSI &lt; 30 and Bollinger Band criteria.</p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm bg-white">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="py-4 px-6 font-semibold text-slate-800 text-sm tracking-wider whitespace-nowrap">Ticker</th>
                        <th className="py-4 px-6 font-semibold text-slate-800 text-sm tracking-wider whitespace-nowrap">Company</th>
                        <th className="py-4 px-6 font-semibold text-slate-800 text-sm tracking-wider whitespace-nowrap">Sector</th>
                        <th className="py-4 px-6 font-semibold text-slate-800 text-sm tracking-wider whitespace-nowrap">Price</th>
                        <th className="py-4 px-6 font-semibold text-slate-800 text-sm tracking-wider whitespace-nowrap">RSI</th>
                        <th className="py-4 px-6 font-semibold text-slate-800 text-sm tracking-wider whitespace-nowrap">Bands (Lower - Upper)</th>
                        <th className="py-4 px-6 font-semibold text-slate-800 text-sm tracking-wider whitespace-nowrap">Distance From Band</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {data.map((row) => (
                        <tr key={row.ticker} className="hover:bg-slate-50 transition-colors">
                            <td className="py-4 px-6">
                                <a
                                    href={`https://elite.finviz.com/quote.ashx?t=${row.ticker}&ty=c&r=m3&p=d&b=1`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded hover:bg-slate-200 transition-colors cursor-pointer"
                                >
                                    {row.ticker}
                                </a>
                            </td>
                            <td className="py-4 px-6 text-sm text-slate-700 font-medium">{row.company}</td>
                            <td className="py-4 px-6 text-sm text-slate-600">
                                <span className="px-3 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
                                    {row.sector}
                                </span>
                            </td>
                            <td className="py-4 px-6 font-bold text-slate-900 tabular-nums">
                                ${row.price.toFixed(2)}
                            </td>
                            <td className="py-4 px-6">
                                <span className="font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded tabular-nums">
                                    {row.rsi.toFixed(2)}
                                </span>
                            </td>
                            <td className="py-4 px-6 text-sm tabular-nums text-slate-500 font-medium">
                                <span className="text-slate-400">$</span>{row.lowerBand.toFixed(2)} <span className="text-slate-300 mx-1">-</span> <span className="text-slate-400">$</span>{row.upperBand.toFixed(2)}
                            </td>
                            <td className="py-4 px-6">
                                <div className="flex items-center gap-2">
                                    <span className={`font-bold tabular-nums px-2.5 py-1 rounded text-sm ${row.bandSide === 'lower' && row.distanceFromBand > 0 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                        {row.bandSide === 'lower' && row.distanceFromBand > 0 ? '-' : '+'}{Math.abs(row.distanceFromBand).toFixed(2)}%
                                    </span>
                                    <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">
                                        ({row.bandSide})
                                    </span>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
