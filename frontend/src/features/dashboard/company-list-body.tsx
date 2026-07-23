import { CompanyCard } from '@/features/dashboard/company-card';
import {
  hasActiveFilters,
  type DashboardSearchParams,
} from '@/features/dashboard/build-filters';
import type { ListCompaniesResult } from '@/lib/api/backend-client';

export function CompanyListBody({
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
