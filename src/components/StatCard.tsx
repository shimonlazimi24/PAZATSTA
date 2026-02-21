"use client";

import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: LucideIcon;
  loading?: boolean;
  className?: string;
}

export function StatCard({
  title,
  value,
  icon: Icon,
  loading,
  className,
}: StatCardProps) {
  return (
    <Card className={cn("rounded-2xl shadow-soft", className)}>
      <CardContent className="p-6">
        {loading ? (
          <>
            <Skeleton className="mb-2 h-4 w-24" />
            <Skeleton className="h-8 w-16" />
          </>
        ) : (
          <>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="mt-1 flex items-center gap-2">
              {Icon && <Icon className="h-5 w-5 text-muted-foreground" />}
              <span className="text-2xl font-semibold">{value}</span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
