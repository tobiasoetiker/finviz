import VolatilityContent from '@/components/VolatilityContent';
import { getAvailableSnapshots, getVolatileStocks } from '@/lib/finviz';

interface PageProps {
  searchParams: Promise<{ snapshot?: string; lookbackDays?: string; groupBy?: string }>;
}

const validGroupBy = ['ticker', 'industry', 'sector'] as const;
type GroupBy = typeof validGroupBy[number];

export default async function VolatilityPage({ searchParams }: PageProps) {
  const { snapshot, lookbackDays, groupBy: groupByParam } = await searchParams;
  const lookback = Math.max(1, Math.min(14, parseInt(lookbackDays || '5', 10) || 5));
  const groupBy: GroupBy = validGroupBy.includes(groupByParam as GroupBy) ? (groupByParam as GroupBy) : 'ticker';

  const snapshots = await getAvailableSnapshots();
  const defaultSnapshotId = snapshots.length > 0 ? snapshots[0].id : 'live';
  const snapshotId = snapshot || defaultSnapshotId;

  const volatileStocks = await getVolatileStocks(snapshotId, lookback, groupBy).catch((error) => {
    console.error('Volatile stocks fetch failed:', error);
    return [];
  });

  return (
    <main className="min-h-screen">
      <VolatilityContent
        snapshots={snapshots}
        lookbackDays={lookback}
        groupBy={groupBy}
        volatileStocks={volatileStocks}
      />
    </main>
  );
}
