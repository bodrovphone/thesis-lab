'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { isSummarizeError, type SummarizeResponse } from '@/lib/ai/summarize.constants';
import { clientFetch, getErrorMessage } from '@/lib/api/client-fetch';

interface CurrentThinkingPanelProps {
  companyId: string;
  noteCount: number;
  initialSummary: string | null;
  initialGeneratedAt: string | null;
}

function formatGeneratedAt(value: string): string {
  return new Date(value).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function CurrentThinkingPanel({
  companyId,
  noteCount,
  initialSummary,
  initialGeneratedAt,
}: CurrentThinkingPanelProps) {
  const router = useRouter();
  const [summary, setSummary] = useState(initialSummary);
  const [generatedAt, setGeneratedAt] = useState(initialGeneratedAt);
  const [notesOmitted, setNotesOmitted] = useState<number | null>(null);

  const regenerateMutation = useMutation({
    mutationFn: async () => {
      const generateBody = await clientFetch<
        SummarizeResponse & { message?: string }
      >('/api/summarize', {
        method: 'POST',
        body: JSON.stringify({ companyId }),
      });

      if (isSummarizeError(generateBody)) {
        throw new Error(generateBody.message);
      }

      const company = await clientFetch<{
        currentThinkingSummary: string | null;
        summaryGeneratedAt: string | null;
      }>(`/api/companies/${companyId}/summary`, {
        method: 'PATCH',
        body: JSON.stringify({
          currentThinkingSummary: generateBody.summary,
        }),
      });

      return {
        company,
        notesOmitted: generateBody.notesOmitted,
      };
    },
    onSuccess: ({ company, notesOmitted: omitted }) => {
      setSummary(company.currentThinkingSummary);
      setGeneratedAt(company.summaryGeneratedAt);
      setNotesOmitted(omitted);
      router.refresh();
    },
  });

  const isGenerating = regenerateMutation.isPending;
  const error = regenerateMutation.isError
    ? getErrorMessage(regenerateMutation.error, 'Could not regenerate summary')
    : null;

  function handleRegenerate() {
    if (isGenerating || noteCount === 0) {
      return;
    }
    regenerateMutation.mutate();
  }

  return (
    <section className="flex flex-col gap-3 rounded-md border border-black/10 p-4 dark:border-white/15">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Current thinking</h2>
          <p className="text-muted text-sm">
            On-demand synthesis of your note history — not investment advice.
          </p>
        </div>
        <button
          type="button"
          onClick={handleRegenerate}
          disabled={isGenerating || noteCount === 0}
          className="rounded-md border border-black/10 px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/15"
        >
          {isGenerating ? 'Generating…' : 'Regenerate summary'}
        </button>
      </div>

      {noteCount === 0 && (
        <p className="text-muted text-sm">Add a note before generating a summary.</p>
      )}

      {summary ? (
        <div className="flex flex-col gap-2">
          <p className="whitespace-pre-wrap text-sm leading-6">{summary}</p>
          {generatedAt && (
            <p className="text-muted text-xs">
              Generated {formatGeneratedAt(generatedAt)}
            </p>
          )}
          {notesOmitted !== null && notesOmitted > 0 && (
            <p className="text-muted text-xs">
              Based on recent notes ({notesOmitted} older note
              {notesOmitted === 1 ? '' : 's'} omitted for length).
            </p>
          )}
        </div>
      ) : (
        !isGenerating &&
        noteCount > 0 && (
          <p className="text-muted text-sm">
            No summary yet. Regenerate to synthesize your notes into a current-thinking
            paragraph.
          </p>
        )
      )}

      {isGenerating && (
        <p className="text-muted text-sm">Synthesizing notes…</p>
      )}

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </section>
  );
}
