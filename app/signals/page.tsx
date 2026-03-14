import SignalsContent from '@/components/SignalsContent';
import { getAvailableSnapshots, getBollingerOversoldStocks } from '@/lib/finviz';

interface PageProps {
  searchParams: Promise<{ snapshot?: string, bollingerRsi?: string }>;
}

export default async function SignalsPage({ searchParams }: PageProps) {
  const { snapshot, bollingerRsi } = await searchParams;
  const bollingerRsiThreshold = Math.max(1, Math.min(100, parseInt(bollingerRsi || '30', 10) || 30));

  const snapshots = await getAvailableSnapshots();
  const defaultSnapshotId = snapshots.length > 0 ? snapshots[0].id : 'live';
  const snapshotId = snapshot || defaultSnapshotId;

  const bollingerSignals = await getBollingerOversoldStocks(snapshotId, bollingerRsiThreshold).catch((error) => {
    console.error('Bollinger signals failed:', error);
    return [];
  });

  return (
    <main className="min-h-screen bg-white">
      <SignalsContent
        snapshots={snapshots}
        bollingerRsiThreshold={bollingerRsiThreshold}
        bollingerSignals={bollingerSignals}
      />
    </main>
  );
}
