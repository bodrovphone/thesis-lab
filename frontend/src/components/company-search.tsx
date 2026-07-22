'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { CompanySearchCandidate } from '@/types/company';

type SearchStatus = 'idle' | 'loading' | 'success' | 'error';

const DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 2;

export function CompanySearch() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [candidates, setCandidates] = useState<CompanySearchCandidate[]>([]);
  const [status, setStatus] = useState<SearchStatus>('idle');
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const trimmedQuery = query.trim();
  const isQueryTooShort = trimmedQuery.length < MIN_QUERY_LENGTH;

  useEffect(() => {
    abortRef.current?.abort();

    if (isQueryTooShort) {
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;

    const timeoutId = setTimeout(() => {
      setStatus('loading');
      setSearchError(null);

      fetch(`/api/companies/search?q=${encodeURIComponent(trimmedQuery)}`, {
        signal: controller.signal,
      })
        .then(async (response) => {
          if (!response.ok) {
            const body = (await response.json().catch(() => null)) as {
              message?: string;
            } | null;
            throw new Error(body?.message ?? 'Search failed');
          }
          return response.json() as Promise<{
            items: CompanySearchCandidate[];
          }>;
        })
        .then((body) => {
          setCandidates(body.items);
          setStatus('success');
        })
        .catch((error: unknown) => {
          if (error instanceof DOMException && error.name === 'AbortError') {
            return;
          }
          setStatus('error');
          setSearchError(error instanceof Error ? error.message : 'Search failed');
        });
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [trimmedQuery, isQueryTooShort]);

  async function handleSelect(candidate: CompanySearchCandidate) {
    if (isCreating) {
      return;
    }
    setIsCreating(true);
    setCreateError(null);

    try {
      const response = await fetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker: candidate.ticker }),
      });

      if (response.status === 409) {
        setCreateError('This company is already tracked.');
        setIsCreating(false);
        return;
      }

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          message?: string;
        } | null;
        setCreateError(body?.message ?? 'Could not add this company.');
        setIsCreating(false);
        return;
      }

      const company = (await response.json()) as { id: string };
      router.push(`/companies/${company.id}`);
      router.refresh();
    } catch {
      setCreateError('Could not add this company.');
      setIsCreating(false);
    }
  }

  return (
    <div className="w-full max-w-xl">
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

      {!isQueryTooShort && status === 'loading' && (
        <p className="text-muted mt-2 text-sm">Searching…</p>
      )}

      {!isQueryTooShort && status === 'error' && searchError && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{searchError}</p>
      )}

      {!isQueryTooShort && status === 'success' && candidates.length === 0 && (
        <p className="text-muted mt-2 text-sm">No matches found.</p>
      )}

      {!isQueryTooShort && candidates.length > 0 && (
        <ul className="mt-2 divide-y divide-black/10 rounded-md border border-black/10 dark:divide-white/10 dark:border-white/15">
          {candidates.slice(0, 10).map((candidate) => (
            <li key={candidate.ticker}>
              <button
                type="button"
                onClick={() => handleSelect(candidate)}
                disabled={isCreating}
                className="flex w-full items-center justify-between gap-3 px-4 py-2 text-left hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-white/10"
              >
                <span>
                  <span className="font-medium">{candidate.ticker}</span>{' '}
                  <span className="text-muted">{candidate.name}</span>
                </span>
                {candidate.exchange && (
                  <span className="text-muted text-sm">{candidate.exchange}</span>
                )}
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
