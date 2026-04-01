import VolatilityContent from '@/components/VolatilityContent';
import { getAvailableSnapshots, getVolatileStocks, getVolatilityBacktest } from '@/lib/finviz';

interface PageProps {
  searchParams: Promise<{ snapshot?: string; lookbackDays?: string; groupBy?: string; mode?: string; backtestDays?: string }>;
}

const validGroupBy = ['ticker', 'industry', 'sector'] as const;
type GroupBy = typeof validGroupBy[number];

export default async function VolatilityPage({ searchParams }: PageProps) {
  const { snapshot, lookbackDays, groupBy: groupByParam, mode: modeParam, backtestDays } = await searchParams;
  const lookback = Math.max(1, Math.min(14, parseInt(lookbackDays || '5', 10) || 5));
  const groupBy: GroupBy = validGroupBy.includes(groupByParam as GroupBy) ? (groupByParam as GroupBy) : 'ticker';
  const mode = modeParam === 'backtest' ? 'backtest' : 'live';
  const backtestHoldDays = Math.max(1, Math.min(15, parseInt(backtestDays || '5', 10) || 5));

  const snapshots = await getAvailableSnapshots();
  const defaultSnapshotId = snapshots.length > 0 ? snapshots[0].id : 'live';
  const snapshotId = snapshot || defaultSnapshotId;

  const volatileStocks = await getVolatileStocks(snapshotId, lookback, groupBy).catch((error) => {
    console.error('Volatile stocks fetch failed:', error);
    return [];
  });

  const volatilityBacktest = mode === 'backtest' 
    ? await getVolatilityBacktest(snapshotId, backtestHoldDays, lookback).catch((error) => {
        console.error('Volatility backtest failed:', error);
        return undefined;
      })
    : undefined;

  return (
    <main className="min-h-screen">
      <VolatilityContent
        snapshots={snapshots}
        lookbackDays={lookback}
        groupBy={groupBy}
        volatileStocks={volatileStocks}
        mode={mode}
        backtestDays={backtestHoldDays}
        backtestData={volatilityBacktest}
      />
    </main>
  );
}
