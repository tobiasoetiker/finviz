import DashboardContent from '@/components/DashboardContent';
import { getAvailableSnapshots, getIndustryPerformance, getAvailableSectors, getAvailableIndustries, getBollingerOversoldStocks, getBollingerBacktest } from '@/lib/finviz';
import { IndustryApiResponse } from '@/types';

interface PageProps {
  searchParams: Promise<{ snapshot?: string, groupBy?: string, sector?: string, industry?: string, yAxis?: string, bollingerRsi?: string, backtestDays?: string }>;
}

export default async function Home({ searchParams }: PageProps) {
  const { snapshot, groupBy, sector, industry, yAxis, bollingerRsi, backtestDays } = await searchParams;
  const bollingerRsiThreshold = Math.max(1, Math.min(100, parseInt(bollingerRsi || '30', 10) || 30));
  const backtestLookback = Math.max(1, Math.min(5, parseInt(backtestDays || '1', 10) || 1));
  const groupByParam = (groupBy === 'industry' ? 'industry' : (groupBy === 'ticker' ? 'ticker' : 'sector')) as 'industry' | 'sector' | 'ticker';

  // Fetch available snapshots first to determine the fallback default
  const snapshots = await getAvailableSnapshots();
  const defaultSnapshotId = snapshots.length > 0 ? snapshots[0].id : 'live';

  // Handle multiple snapshots (comma separated IDs)
  const snapshotIds = snapshot ? snapshot.split(',') : [defaultSnapshotId];

  // Fetch primary data (sectors, industries, performance) — errors here should break the page
  const [sectors, industries, ...multiData] = await Promise.all([
    getAvailableSectors(snapshotIds[0]),
    getAvailableIndustries(snapshotIds[0], sector),
    ...snapshotIds.map(id => getIndustryPerformance(id === 'live' ? undefined : id, false, groupByParam, sector, industry))
  ]);

  // Fetch Bollinger data separately — failures here degrade gracefully without breaking the dashboard
  const [bollingerSignals, bollingerBacktest] = await Promise.all([
    getBollingerOversoldStocks(snapshotIds[0], bollingerRsiThreshold).catch((error) => {
      console.error('Bollinger signals failed (dashboard will render without them):', error);
      return [];
    }),
    getBollingerBacktest(snapshotIds[0], bollingerRsiThreshold, backtestLookback).catch((error) => {
      console.error('Bollinger backtest failed (dashboard will render without it):', error);
      return undefined;
    }),
  ]);

  // Create a mapping of snapshot ID to data
  const multiSnapshotData: Record<string, IndustryApiResponse> = {};
  snapshotIds.forEach((id, index) => {
    multiSnapshotData[id] = multiData[index];
  });

  return (
    <main className="min-h-screen bg-white">
      <DashboardContent
        data={multiData[multiData.length - 1]} // Use the last selected snapshot as primary data
        multiSnapshotData={multiSnapshotData}
        snapshots={snapshots}
        sectors={sectors}
        industries={industries}
        yAxis={yAxis}
        bollingerRsiThreshold={bollingerRsiThreshold}
        backtestDays={backtestLookback}
        bollingerSignals={bollingerSignals}
        bollingerBacktest={bollingerBacktest}
      />
    </main>
  );
}
