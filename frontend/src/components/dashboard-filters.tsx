'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import type { TaxonomyView } from '@/types/note';

interface DashboardFiltersProps {
  taxonomy: TaxonomyView;
}

const SELECT_CLASS =
  'rounded-md border border-black/10 bg-transparent px-3 py-2 text-sm outline-none focus:border-black/30 dark:border-white/15 dark:focus:border-white/30';

export function DashboardFilters({ taxonomy }: DashboardFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const conviction = searchParams.get('conviction') ?? '';
  const moatPattern = searchParams.get('moatPattern') ?? '';
  const businessModel = searchParams.get('businessModel') ?? '';

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    const query = params.toString();
    router.push(query ? `/?${query}` : '/');
  }

  function clearAll() {
    router.push('/');
  }

  const hasActiveFilters = Boolean(conviction || moatPattern || businessModel);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex min-w-[10rem] flex-col gap-1">
          <label htmlFor="filter-conviction" className="text-muted text-sm">
            Conviction
          </label>
          <select
            id="filter-conviction"
            value={conviction}
            onChange={(event) => updateParam('conviction', event.target.value)}
            className={SELECT_CLASS}
          >
            <option value="">Any conviction</option>
            {taxonomy.convictionLevels.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex min-w-[10rem] flex-col gap-1">
          <label htmlFor="filter-moat" className="text-muted text-sm">
            Moat pattern
          </label>
          <select
            id="filter-moat"
            value={moatPattern}
            onChange={(event) => updateParam('moatPattern', event.target.value)}
            className={SELECT_CLASS}
          >
            <option value="">Any moat pattern</option>
            {taxonomy.moatPatterns.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex min-w-[10rem] flex-col gap-1">
          <label htmlFor="filter-business-model" className="text-muted text-sm">
            Business model
          </label>
          <select
            id="filter-business-model"
            value={businessModel}
            onChange={(event) => updateParam('businessModel', event.target.value)}
            className={SELECT_CLASS}
          >
            <option value="">Any business model</option>
            {taxonomy.businessModels.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearAll}
            className="rounded-md border border-black/10 px-3 py-2 text-sm hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10"
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
