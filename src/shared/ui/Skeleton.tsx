import { cn } from "@/utils/cn";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse bg-ink/10 border border-ink/20",
        className
      )}
      {...props}
    />
  );
}

export function SoundCardSkeleton() {
  return (
    <div className="border-2 border-ink/20 bg-paper/60 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="size-8" />
        <Skeleton className="h-4 w-12" />
      </div>
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
      <div className="pt-2 flex justify-between items-center border-t border-ink/10">
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-6 w-20" />
      </div>
    </div>
  );
}

export function ExcuseCardSkeleton() {
  return (
    <div className="border border-paper/20 bg-ink/40 p-3 space-y-2">
      <Skeleton className="h-4 w-full bg-paper/10" />
      <Skeleton className="h-3 w-4/5 bg-paper/10" />
    </div>
  );
}
