import type { ListCompaniesFilters } from '@/lib/api/backend-client';

export interface DashboardSearchParams {
  conviction?: string;
  moatPattern?: string;
  businessModel?: string;
}

export function buildFilters(
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

export function hasActiveFilters(searchParams: DashboardSearchParams): boolean {
  return Boolean(
    searchParams.conviction ||
      searchParams.moatPattern ||
      searchParams.businessModel,
  );
}
