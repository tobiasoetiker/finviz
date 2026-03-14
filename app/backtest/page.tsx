import BacktestContent from '@/components/BacktestContent';
import { getAvailableSnapshots, getBollingerBacktest } from '@/lib/finviz';

interface PageProps {
  searchParams: Promise<{ snapshot?: string, bollingerRsi?: string, backtestDays?: string }>;
}

export default async function BacktestPage({ searchParams }: PageProps) {
  const { snapshot, bollingerRsi, backtestDays } = await searchParams;
  const bollingerRsiThreshold = Math.max(1, Math.min(100, parseInt(bollingerRsi || '30', 10) || 30));
  const backtestLookback = Math.max(1, Math.min(5, parseInt(backtestDays || '1', 10) || 1));

  const snapshots = await getAvailableSnapshots();
  const defaultSnapshotId = snapshots.length > 0 ? snapshots[0].id : 'live';
  const snapshotId = snapshot || defaultSnapshotId;

  const bollingerBacktest = await getBollingerBacktest(snapshotId, bollingerRsiThreshold, backtestLookback).catch((error) => {
    console.error('Bollinger backtest failed:', error);
    return undefined;
  });

  return (
    <main className="min-h-screen">
      <BacktestContent
        snapshots={snapshots}
        bollingerRsiThreshold={bollingerRsiThreshold}
        backtestDays={backtestLookback}
        bollingerBacktest={bollingerBacktest}
      />
    </main>
  );
}
