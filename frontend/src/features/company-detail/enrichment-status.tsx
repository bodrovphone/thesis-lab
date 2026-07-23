'use client';

import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { clientFetch, getErrorMessage } from '@/lib/api/client-fetch';
import {
  formatEnrichmentBadge,
  type EnrichmentStatus as EnrichmentStatusValue,
} from '@/types/company';

export function EnrichmentStatus({
  companyId,
  status,
}: {
  companyId: string;
  status: EnrichmentStatusValue;
}) {
  const router = useRouter();

  const retryMutation = useMutation({
    mutationFn: () =>
      clientFetch<{ message?: string }>(
        `/api/companies/${companyId}/refresh-enrichment`,
        { method: 'POST' },
      ),
    onSuccess: () => {
      router.refresh();
    },
  });

  if (status === 'COMPLETE' && !retryMutation.isSuccess) {
    return null;
  }

  const message = retryMutation.isSuccess
    ? 'Profile refreshed.'
    : retryMutation.isError
      ? getErrorMessage(retryMutation.error, 'Could not refresh profile')
      : null;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--badge-partial-fg)]/20 bg-[var(--badge-partial-bg)]/60 px-3 py-2 text-sm">
      <span className="font-medium">
        {retryMutation.isSuccess
          ? 'Profile refreshed'
          : formatEnrichmentBadge(status)}
      </span>
      {!retryMutation.isSuccess && (
        <button
          type="button"
          onClick={() => retryMutation.mutate()}
          disabled={retryMutation.isPending}
          className="rounded-full bg-[var(--badge-partial-fg)] px-3 py-1 text-xs font-semibold text-white transition hover:opacity-85 disabled:opacity-60"
        >
          {retryMutation.isPending ? 'Refreshing…' : 'Retry enrichment'}
        </button>
      )}
      {message && <span className="text-xs">{message}</span>}
    </div>
  );
}
