import { Skeleton } from "@/components/ui/skeleton";

export const CardSkeleton = () => (
  <div className="glass-card rounded-2xl p-4 space-y-3">
    <Skeleton className="h-4 w-24" />
    <Skeleton className="h-8 w-32" />
    <Skeleton className="h-2 w-full" />
  </div>
);

export const ListItemSkeleton = () => (
  <div className="glass-card rounded-xl p-3 flex items-center gap-3">
    <Skeleton className="w-10 h-10 rounded-xl" />
    <div className="flex-1 space-y-2">
      <Skeleton className="h-4 w-28" />
      <Skeleton className="h-3 w-20" />
    </div>
    <Skeleton className="h-4 w-16" />
  </div>
);

export const GridItemSkeleton = () => (
  <div className="glass-card rounded-2xl p-4 flex flex-col items-center gap-2">
    <Skeleton className="w-12 h-12 rounded-xl" />
    <Skeleton className="h-4 w-16" />
    <Skeleton className="h-3 w-12" />
  </div>
);

export const ChartSkeleton = () => (
  <div className="glass-card rounded-2xl p-5 space-y-4">
    <Skeleton className="h-4 w-40" />
    <Skeleton className="w-44 h-44 rounded-full mx-auto" />
    <div className="flex gap-3 justify-center">
      <Skeleton className="h-3 w-16" />
      <Skeleton className="h-3 w-16" />
      <Skeleton className="h-3 w-16" />
    </div>
  </div>
);

export const StatSkeleton = () => (
  <div className="glass-card rounded-2xl p-4 text-center space-y-2">
    <Skeleton className="w-6 h-6 mx-auto rounded" />
    <Skeleton className="h-7 w-12 mx-auto" />
    <Skeleton className="h-3 w-20 mx-auto" />
  </div>
);
