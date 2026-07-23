import { Suspense } from 'react';
import { DashboardFilters } from '@/features/dashboard/dashboard-filters';
import type { TaxonomyView } from '@/types/note';

export function FilterBar({ taxonomy }: { taxonomy: TaxonomyView }) {
  return (
    <section id="tracked-companies" className="flex flex-col gap-4">
      <div className="flex items-end justify-between gap-3"><div><p className="eyebrow">Workspace</p><h2 className="mt-1 text-xl font-semibold tracking-tight">Tracked companies</h2></div><span className="text-muted text-xs">Filter by thesis shape</span></div>
      <Suspense fallback={<p className="text-muted text-sm">Loading filters…</p>}>
        <DashboardFilters taxonomy={taxonomy} />
      </Suspense>
    </section>
  );
}
