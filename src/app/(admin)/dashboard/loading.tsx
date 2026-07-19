import { PageHeaderSkeleton, StatCardsSkeleton } from "@/components/shared/skeletons";

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton withAction={false} />
      <StatCardsSkeleton count={5} />
    </div>
  );
}
