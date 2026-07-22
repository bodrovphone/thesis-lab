'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { formatEnrichmentBadge, type EnrichmentStatus } from '@/types/company';

export function EnrichmentStatus({ companyId, status }: { companyId: string; status: EnrichmentStatus }) {
  const router = useRouter();
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);

  if (status === 'COMPLETE' && state !== 'success') return null;

  async function retry() {
    setState('loading'); setMessage(null);
    try {
      const response = await fetch(`/api/companies/${companyId}/refresh-enrichment`, { method: 'POST' });
      const body = (await response.json().catch(() => null)) as { message?: string } | null;
      if (!response.ok) throw new Error(body?.message ?? 'Could not refresh profile');
      setState('success'); setMessage('Profile refreshed.'); router.refresh();
    } catch (error) { setState('error'); setMessage(error instanceof Error ? error.message : 'Could not refresh profile'); }
  }

  return <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--badge-partial-fg)]/20 bg-[var(--badge-partial-bg)]/60 px-3 py-2 text-sm"><span className="font-medium">{state === 'success' ? 'Profile refreshed' : formatEnrichmentBadge(status)}</span>{state !== 'success' && <button type="button" onClick={retry} disabled={state === 'loading'} className="rounded-full bg-[var(--badge-partial-fg)] px-3 py-1 text-xs font-semibold text-white transition hover:opacity-85 disabled:opacity-60">{state === 'loading' ? 'Refreshing…' : 'Retry enrichment'}</button>}{message && <span className="text-xs">{message}</span>}</div>;
}
