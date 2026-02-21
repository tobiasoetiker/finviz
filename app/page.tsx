import DashboardContent from '@/components/DashboardContent';
import { getAvailableSnapshots, getIndustryPerformance, getAvailableSectors, getAvailableIndustries } from '@/lib/finviz';
import { IndustryApiResponse } from '@/types';

interface PageProps {
  searchParams: Promise<{ snapshot?: string, groupBy?: string, sector?: string, industry?: string, yAxis?: string }>;
}

export default async function Home({ searchParams }: PageProps) {
  const { snapshot, groupBy, sector, industry, yAxis } = await searchParams;
  const groupByParam = (groupBy === 'sector' ? 'sector' : (groupBy === 'ticker' ? 'ticker' : 'industry')) as 'industry' | 'sector' | 'ticker';

  // Handle multiple snapshots (comma separated IDs)
  const snapshotIds = snapshot ? snapshot.split(',') : ['live'];

  // Fetch data for all snapshots in parallel
  const [snapshots, sectors, industries, ...multiData] = await Promise.all([
    getAvailableSnapshots(),
    getAvailableSectors(snapshotIds[0]),
    getAvailableIndustries(snapshotIds[0], sector),
    ...snapshotIds.map(id => getIndustryPerformance(id === 'live' ? undefined : id, false, groupByParam, sector, industry))
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
      />
    </main>
  );
}
