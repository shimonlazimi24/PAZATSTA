/** Title, one-line explanation and optional actions at the top of every admin screen. */
export function AdminPageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between" dir="rtl">
      <div className="space-y-1 text-right">
        <h2 className="text-xl font-bold text-[var(--color-text)]">{title}</h2>
        {description && <p className="text-sm text-[var(--color-text-muted)]">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
