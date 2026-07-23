'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import {
  ClientApiError,
  clientFetch,
  getErrorMessage,
} from '@/lib/api/client-fetch';
import { queryKeys } from '@/lib/query/keys';
import {
  formatSourceLabel,
  type CompanySearchCandidate,
} from '@/types/company';

const DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 2;

function SourceBadges({ sources }: { sources: CompanySearchCandidate['sources'] }) {
  return (
    <span className="flex shrink-0 flex-wrap justify-end gap-1">
      {sources.map((source) => (
        <span
          key={source}
          className="rounded-full border border-black/10 px-2 py-0.5 text-xs dark:border-white/15"
        >
          {formatSourceLabel(source)}
        </span>
      ))}
    </span>
  );
}

export function CompanySearch() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const trimmedQuery = query.trim();
  const debouncedQuery = useDebouncedValue(trimmedQuery, DEBOUNCE_MS);
  const isInputTooShort = trimmedQuery.length < MIN_QUERY_LENGTH;
  const isDebouncedTooShort = debouncedQuery.length < MIN_QUERY_LENGTH;

  const searchQuery = useQuery({
    queryKey: queryKeys.companySearch(debouncedQuery),
    queryFn: ({ signal }) =>
      clientFetch<{ items: CompanySearchCandidate[] }>(
        `/api/companies/search?q=${encodeURIComponent(debouncedQuery)}`,
        { signal },
      ),
    enabled: !isDebouncedTooShort,
    staleTime: 60_000,
  });

  const createMutation = useMutation({
    mutationFn: (ticker: string) =>
      clientFetch<{ id: string }>('/api/companies', {
        method: 'POST',
        body: JSON.stringify({ ticker }),
      }),
    onSuccess: (company) => {
      router.push(`/companies/${company.id}`);
      router.refresh();
    },
  });

  const candidates =
    !isInputTooShort && trimmedQuery === debouncedQuery
      ? (searchQuery.data?.items ?? [])
      : [];
  const isSearching =
    !isInputTooShort &&
    (trimmedQuery !== debouncedQuery || searchQuery.isFetching);
  const searchError =
    !isInputTooShort &&
    trimmedQuery === debouncedQuery &&
    searchQuery.isError
      ? getErrorMessage(searchQuery.error, 'Search failed')
      : null;
  const createError =
    createMutation.isError
      ? createMutation.error instanceof ClientApiError &&
        createMutation.error.status === 409
        ? 'This company is already tracked.'
        : getErrorMessage(createMutation.error, 'Could not add this company.')
      : null;

  function handleSelect(candidate: CompanySearchCandidate) {
    if (createMutation.isPending) {
      return;
    }
    createMutation.mutate(candidate.ticker);
  }

  return (
    <div id="company-search" className="w-full max-w-xl">
      <label htmlFor="company-search" className="sr-only">
        Search companies
      </label>
      <input
        id="company-search"
        type="text"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search ticker or company name…"
        autoComplete="off"
        className="w-full rounded-md border border-black/10 bg-transparent px-4 py-2 text-base outline-none focus:border-black/30 dark:border-white/15 dark:focus:border-white/30"
      />

      {!isInputTooShort && isSearching && (
        <p className="text-muted mt-2 text-sm">Searching…</p>
      )}

      {searchError && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{searchError}</p>
      )}

      {!isInputTooShort &&
        !isSearching &&
        searchQuery.isSuccess &&
        candidates.length === 0 && (
          <p className="text-muted mt-2 text-sm">No matches found.</p>
        )}

      {candidates.length > 0 && (
        <ul className="mt-2 divide-y divide-black/10 rounded-md border border-black/10 dark:divide-white/10 dark:border-white/15">
          {candidates.slice(0, 10).map((candidate) => (
            <li key={candidate.ticker}>
              <button
                type="button"
                onClick={() => handleSelect(candidate)}
                disabled={createMutation.isPending}
                className="flex w-full items-center justify-between gap-3 px-4 py-2 text-left hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-white/10"
              >
                <span>
                  <span className="font-medium">{candidate.ticker}</span>{' '}
                  <span className="text-muted">{candidate.name}</span>
                </span>
                <span className="flex items-center gap-2">
                  {candidate.exchange && (
                    <span className="text-muted text-sm">{candidate.exchange}</span>
                  )}
                  <SourceBadges sources={candidate.sources} />
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {createError && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{createError}</p>
      )}
    </div>
  );
}
