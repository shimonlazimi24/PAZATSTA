"use client";

import { Card } from "./Card";

export interface SummaryRow {
  label: string;
  value: string;
}

interface SummaryCardProps {
  title: string;
  rows: SummaryRow[];
  className?: string;
}

export function SummaryCard({ title, rows, className }: SummaryCardProps) {
  return (
    <Card className={className}>
      <h3 className="text-lg font-bold text-[var(--color-text)] mb-4">{title}</h3>
      <dl className="space-y-3">
        {rows.map((row) => (
          <div key={row.label} className="flex justify-between gap-4 text-sm">
            <dt className="text-[var(--color-text-muted)]">{row.label}</dt>
            <dd className="font-medium text-[var(--color-text)] text-left">{row.value}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}
