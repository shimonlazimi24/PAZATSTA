import { Skeleton } from "@/components/ui/skeleton";

/** Placeholder shown by loading.tsx while a route's server data resolves. */
export function PageSkeleton({ title }: { title?: string }) {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] p-6" dir="rtl">
      <div className="max-w-4xl mx-auto space-y-6">
        <span className="sr-only" role="status">
          {title ? `טוען ${title}…` : "טוען…"}
        </span>
        <Skeleton className="h-8 w-48" />
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    </div>
  );
}
