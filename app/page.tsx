import DashboardContent from '@/components/DashboardContent';
import { getAvailableSnapshots, getIndustryPerformance, getAvailableSectors } from '@/lib/finviz';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ snapshot?: string, groupBy?: string, sector?: string }>;
}

export default async function Home({ searchParams }: PageProps) {
  const { snapshot, groupBy, sector } = await searchParams;
  const snapshotId = snapshot;
  const groupByParam = (groupBy === 'sector' ? 'sector' : 'industry') as 'industry' | 'sector';

  const [data, snapshots, sectors] = await Promise.all([
    getIndustryPerformance(snapshotId, false, groupByParam, sector),
    getAvailableSnapshots(),
    getAvailableSectors(snapshotId)
  ]);

  return (
    <main className="min-h-screen bg-white">
      <DashboardContent
        data={data}
        snapshots={snapshots}
        sectors={sectors}
      />
    </main>
  );
}
