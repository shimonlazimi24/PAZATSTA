"use client";

import Link from "next/link";
import { Button } from "./Button";

export interface CategoryCardProps {
  title: string;
  subtitle?: string;
  imagePlaceholder?: boolean;
  href?: string;
}

export function CategoryCard({ title, subtitle, imagePlaceholder = true, href = "/book" }: CategoryCardProps) {
  const content = (
    <div className="flex h-full flex-col rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-hover)] overflow-hidden">
      {imagePlaceholder && (
        <div className="h-40 bg-[var(--color-bg-muted)] flex items-center justify-center text-[var(--color-text-muted)] text-sm border-b border-[var(--color-border)]">
          תמונה
        </div>
      )}
      <div className="flex flex-1 flex-col p-5 text-right">
        <h3 className="text-xl font-bold text-[var(--color-text)]">{title}</h3>
        {subtitle ? <p className="mt-1 text-sm text-[var(--color-text-muted)]">{subtitle}</p> : null}
        <div className="mt-4">
          <span className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--color-bg-muted)] px-6 py-3 text-sm font-semibold text-[var(--color-text)] hover:bg-[var(--color-border)]">
            קביעת שיעור פרטי
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </span>
        </div>
      </div>
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}
