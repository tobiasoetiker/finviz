import { BollingerSignalRow } from '@/types';

const formatMarketCap = (value: number) => {
    if (value >= 1e12) return `${(value / 1e12).toFixed(2)}T`;
    if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
    return value.toLocaleString();
};

export default function BollingerSignals({ data, rsiThreshold = 30 }: { data: BollingerSignalRow[]; rsiThreshold?: number }) {
    if (!data || data.length === 0) {
        return (
            <div className="py-10 text-center text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                <p>No stocks currently meet the RSI &lt; {rsiThreshold} and Bollinger Band criteria.</p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm bg-white">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="py-2.5 px-4 font-semibold text-slate-800 text-xs tracking-wider whitespace-nowrap">Ticker</th>
                        <th className="py-2.5 px-4 font-semibold text-slate-800 text-xs tracking-wider whitespace-nowrap">Company</th>
                        <th className="py-2.5 px-4 font-semibold text-slate-800 text-xs tracking-wider whitespace-nowrap hidden sm:table-cell">Sector</th>
                        <th className="py-2.5 px-4 font-semibold text-slate-800 text-xs tracking-wider whitespace-nowrap text-right">Price</th>
                        <th className="py-2.5 px-4 font-semibold text-slate-800 text-xs tracking-wider whitespace-nowrap text-right">RSI</th>
                        <th className="py-2.5 px-4 font-semibold text-slate-800 text-xs tracking-wider whitespace-nowrap text-right hidden md:table-cell">Market Cap</th>
                        <th className="py-2.5 px-4 font-semibold text-slate-800 text-xs tracking-wider whitespace-nowrap text-right">Distance</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {data.map((row) => (
                        <tr key={row.ticker} className="hover:bg-slate-50 transition-colors">
                            <td className="py-3 px-4">
                                <a
                                    href={`https://elite.finviz.com/quote.ashx?t=${row.ticker}&ty=c&r=m3&p=d&b=1`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-xs hover:bg-slate-200 transition-colors cursor-pointer"
                                >
                                    {row.ticker}
                                </a>
                            </td>
                            <td className="py-3 px-4 text-xs text-slate-700 font-medium truncate max-w-[120px]" title={row.company}>{row.company}</td>
                            <td className="py-3 px-4 text-xs text-slate-600 hidden sm:table-cell">
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-50 text-indigo-700">
                                    {row.sector}
                                </span>
                            </td>
                            <td className="py-3 px-4 font-bold text-slate-900 tabular-nums text-xs text-right">
                                ${row.price.toFixed(2)}
                            </td>
                            <td className="py-3 px-4 text-right">
                                <span className="font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded tabular-nums text-xs">
                                    {row.rsi.toFixed(2)}
                                </span>
                            </td>
                            <td className="py-3 px-4 text-right text-xs tabular-nums text-slate-600 font-medium hidden md:table-cell">
                                {formatMarketCap(row.marketCap)}
                            </td>
                            <td className="py-3 px-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                    <span className={`font-bold tabular-nums px-2 py-0.5 rounded text-[10px] ${row.bandSide === 'lower' && row.distanceFromBand > 0 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                        {row.bandSide === 'lower' && row.distanceFromBand > 0 ? '-' : '+'}{Math.abs(row.distanceFromBand).toFixed(2)}%
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
