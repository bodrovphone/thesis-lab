import { CompanySearch } from '@/features/company-search/company-search';
import {
  buildFilters,
  hasActiveFilters,
  type DashboardSearchParams,
} from '@/features/dashboard/build-filters';
import { CompanyListBody } from '@/features/dashboard/company-list-body';
import { FilterBar } from '@/features/dashboard/filter-bar';
import {
  BackendApiError,
  getTags,
  listCompanies,
  type ListCompaniesResult,
} from '@/lib/api/backend-client';
import type { TaxonomyView } from '@/types/note';

interface HomeProps {
  searchParams: Promise<DashboardSearchParams>;
}

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;

  let taxonomy: TaxonomyView;
  try {
    taxonomy = await getTags();
  } catch {
    return (
      <main className="research-shell mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-10 px-5 py-8 sm:px-8 sm:py-12">
        <div className="flex flex-col gap-6 border-b border-black/10 pb-8 dark:border-white/10">
          <div className="flex flex-wrap items-end justify-between gap-6"><div><p className="eyebrow">Private research workspace</p><h1 className="mt-2 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">Thesis Lab<span className="text-[var(--accent)]">.</span></h1><p className="text-muted mt-3 max-w-xl text-sm leading-6">A living notebook for the companies you are trying to understand — and the convictions you are still earning.</p></div><div className="flex items-center gap-2 text-xs text-muted"><span className="status-pulse h-2 w-2 rounded-full bg-[var(--accent)]" /> Systems nominal</div></div>
          <CompanySearch />
        </div>
        <p className="text-sm text-red-600 dark:text-red-400">
          Could not load filter options. Please try again.
        </p>
      </main>
    );
  }

  let listResult: ListCompaniesResult | null = null;
  let listError: string | null = null;

  try {
    listResult = await listCompanies(buildFilters(params));
  } catch (error) {
    listError =
      error instanceof BackendApiError
        ? error.message
        : 'Could not load companies. Please try again.';
  }

  return (
    <main className="research-shell mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-10 px-5 py-8 sm:px-8 sm:py-12">
      <div className="flex flex-col gap-6 border-b border-black/10 pb-8 dark:border-white/10">
        <div className="flex flex-wrap items-end justify-between gap-6"><div><p className="eyebrow">Private research workspace</p><h1 className="mt-2 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">Thesis Lab<span className="text-[var(--accent)]">.</span></h1><p className="text-muted mt-3 max-w-xl text-sm leading-6">A living notebook for the companies you are trying to understand — and the convictions you are still earning.</p></div><div className="flex items-center gap-2 text-xs text-muted"><span className="status-pulse h-2 w-2 rounded-full bg-[var(--accent)]" /> Systems nominal</div></div>
        <CompanySearch />
      </div>

      <FilterBar taxonomy={taxonomy} />

      {listError ? (
        <>
          <p className="text-sm text-red-600 dark:text-red-400">{listError}</p>
          {hasActiveFilters(params) && (
            <p className="text-muted text-sm">
              Your selected filters are preserved in the URL. Adjust or clear them
              and reload the page.
            </p>
          )}
        </>
      ) : (
        listResult && (
          <CompanyListBody listResult={listResult} searchParams={params} />
        )
      )}
    </main>
  );
}
