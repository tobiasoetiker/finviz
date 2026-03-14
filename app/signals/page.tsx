import SignalsContent from '@/components/SignalsContent';
import { getAvailableSnapshots, getBollingerOversoldStocks, getBollingerBacktest } from '@/lib/finviz';

interface PageProps {
  searchParams: Promise<{ snapshot?: string, bollingerRsi?: string, backtestDays?: string }>;
}

export default async function SignalsPage({ searchParams }: PageProps) {
  const { snapshot, bollingerRsi, backtestDays } = await searchParams;
  const bollingerRsiThreshold = Math.max(1, Math.min(100, parseInt(bollingerRsi || '30', 10) || 30));
  const backtestLookback = Math.max(1, Math.min(5, parseInt(backtestDays || '1', 10) || 1));

  const snapshots = await getAvailableSnapshots();
  const defaultSnapshotId = snapshots.length > 0 ? snapshots[0].id : 'live';
  const snapshotId = snapshot || defaultSnapshotId;

  const [bollingerSignals, bollingerBacktest] = await Promise.all([
    getBollingerOversoldStocks(snapshotId, bollingerRsiThreshold).catch((error) => {
      console.error('Bollinger signals failed:', error);
      return [];
    }),
    getBollingerBacktest(snapshotId, bollingerRsiThreshold, backtestLookback).catch((error) => {
      console.error('Bollinger backtest failed:', error);
      return undefined;
    }),
  ]);

  return (
    <main className="min-h-screen bg-white">
      <SignalsContent
        snapshots={snapshots}
        bollingerRsiThreshold={bollingerRsiThreshold}
        backtestDays={backtestLookback}
        bollingerSignals={bollingerSignals}
        bollingerBacktest={bollingerBacktest}
      />
    </main>
  );
}
