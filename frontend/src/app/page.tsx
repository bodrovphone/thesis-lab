import { Suspense } from 'react';
import { CompanyCard } from '@/components/company-card';
import { CompanySearch } from '@/components/company-search';
import { DashboardFilters } from '@/components/dashboard-filters';
import {
  BackendApiError,
  getTags,
  listCompanies,
  type ListCompaniesFilters,
  type ListCompaniesResult,
} from '@/lib/api/backend-client';
import type { TaxonomyView } from '@/types/note';

interface DashboardSearchParams {
  conviction?: string;
  moatPattern?: string;
  businessModel?: string;
}

interface HomeProps {
  searchParams: Promise<DashboardSearchParams>;
}

function buildFilters(
  searchParams: DashboardSearchParams,
): ListCompaniesFilters | undefined {
  const filters: ListCompaniesFilters = {};

  if (searchParams.conviction) {
    filters.conviction = searchParams.conviction;
  }
  if (searchParams.moatPattern) {
    filters.moatPattern = searchParams.moatPattern;
  }
  if (searchParams.businessModel) {
    filters.businessModel = searchParams.businessModel;
  }

  return Object.keys(filters).length > 0 ? filters : undefined;
}

function hasActiveFilters(searchParams: DashboardSearchParams): boolean {
  return Boolean(
    searchParams.conviction ||
      searchParams.moatPattern ||
      searchParams.businessModel,
  );
}

function FilterBar({ taxonomy }: { taxonomy: TaxonomyView }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-medium">Tracked companies</h2>
      <Suspense fallback={<p className="text-muted text-sm">Loading filters…</p>}>
        <DashboardFilters taxonomy={taxonomy} />
      </Suspense>
    </section>
  );
}

function CompanyListBody({
  listResult,
  searchParams,
}: {
  listResult: ListCompaniesResult;
  searchParams: DashboardSearchParams;
}) {
  const { items, totalTracked } = listResult;

  if (totalTracked === 0) {
    return <p className="text-muted">No companies tracked yet.</p>;
  }

  if (items.length === 0) {
    return (
      <p className="text-muted">
        No companies match these filters. Try clearing one or more controls.
      </p>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {items.map((company) => (
          <CompanyCard key={company.id} company={company} />
        ))}
      </div>
      {hasActiveFilters(searchParams) && (
        <p className="text-muted text-sm">
          Showing {items.length} of {totalTracked} tracked companies.
        </p>
      )}
    </>
  );
}

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;

  let taxonomy: TaxonomyView;
  try {
    taxonomy = await getTags();
  } catch {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-8 p-8">
        <div className="flex flex-col gap-4">
          <h1 className="text-3xl font-semibold">Thesis Lab</h1>
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
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-8 p-8">
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-semibold">Thesis Lab</h1>
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
