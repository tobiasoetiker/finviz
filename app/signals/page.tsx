import SignalsContent from '@/components/SignalsContent';
import { getAvailableSnapshots, getBollingerOversoldStocks } from '@/lib/finviz';

interface PageProps {
  searchParams: Promise<{ snapshot?: string, bollingerRsi?: string, lookbackDays?: string }>;
}

export default async function SignalsPage({ searchParams }: PageProps) {
  const { snapshot, bollingerRsi, lookbackDays } = await searchParams;
  const bollingerRsiThreshold = Math.max(1, Math.min(100, parseInt(bollingerRsi || '30', 10) || 30));
  const lookback = Math.max(1, Math.min(10, parseInt(lookbackDays || '1', 10) || 1));

  const snapshots = await getAvailableSnapshots();
  const defaultSnapshotId = snapshots.length > 0 ? snapshots[0].id : 'live';
  const snapshotId = snapshot || defaultSnapshotId;

  const bollingerSignals = await getBollingerOversoldStocks(snapshotId, bollingerRsiThreshold, lookback).catch((error) => {
    console.error('Bollinger signals failed:', error);
    return [];
  });

  return (
    <main className="min-h-screen">
      <SignalsContent
        snapshots={snapshots}
        bollingerRsiThreshold={bollingerRsiThreshold}
        lookbackDays={lookback}
        bollingerSignals={bollingerSignals}
      />
    </main>
  );
}
