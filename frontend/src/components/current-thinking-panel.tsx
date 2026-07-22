'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { isSummarizeError, type SummarizeResponse } from '@/lib/ai/summarize.constants';

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
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRegenerate() {
    if (isGenerating || noteCount === 0) {
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const generateResponse = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId }),
      });

      const generateBody = (await generateResponse.json()) as SummarizeResponse & {
        message?: string;
      };

      if (!generateResponse.ok || isSummarizeError(generateBody)) {
        throw new Error(
          isSummarizeError(generateBody)
            ? generateBody.message
            : generateBody.message ?? 'Could not generate summary',
        );
      }

      const persistResponse = await fetch(`/api/companies/${companyId}/summary`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentThinkingSummary: generateBody.summary }),
      });

      if (!persistResponse.ok) {
        const body = (await persistResponse.json().catch(() => null)) as {
          message?: string;
        } | null;
        throw new Error(body?.message ?? 'Could not save summary');
      }

      const company = (await persistResponse.json()) as {
        currentThinkingSummary: string | null;
        summaryGeneratedAt: string | null;
      };

      setSummary(company.currentThinkingSummary);
      setGeneratedAt(company.summaryGeneratedAt);
      setNotesOmitted(generateBody.notesOmitted);
      router.refresh();
    } catch (regenerateError) {
      setError(
        regenerateError instanceof Error
          ? regenerateError.message
          : 'Could not regenerate summary',
      );
    } finally {
      setIsGenerating(false);
    }
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
