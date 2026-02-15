import DashboardContent from '@/components/DashboardContent';
import { getIndustryPerformance, getAvailableSnapshots } from '@/lib/finviz';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: { snapshot?: string };
}

export default async function Home({ searchParams }: PageProps) {
  const snapshotId = searchParams.snapshot;
  const [data, snapshots] = await Promise.all([
    getIndustryPerformance(snapshotId),
    getAvailableSnapshots()
  ]);

  return (
    <div className="relative">
      <div className="pt-10">
        <DashboardContent data={data} snapshots={snapshots} />
      </div>
    </div>
  );
}
