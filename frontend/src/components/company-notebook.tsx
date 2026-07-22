'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { isTagSuggestBodyReady } from '@/lib/ai/tag-suggest.constants';
import {
  formatNoteTimestamp,
  labelForOption,
  type NoteView,
  type TaxonomyOption,
} from '@/types/note';
import type { NoteAiAuditPayload, TagSuggestResponse } from '@/types/tag-suggest';
import { isTagSuggestUnavailable } from '@/types/tag-suggest';

interface CompanyNotebookProps {
  companyId: string;
  initialNotes: NoteView[];
  moatPatterns: TaxonomyOption[];
  businessModels: TaxonomyOption[];
}

type NoteDraft = {
  body: string;
  moatPattern: string;
  businessModel: string;
};

const EMPTY_DRAFT: NoteDraft = {
  body: '',
  moatPattern: '',
  businessModel: '',
};

function TagBadge({
  label,
  variant,
}: {
  label: string;
  variant: 'moat' | 'business';
}) {
  const classes =
    variant === 'moat'
      ? 'border-sky-300/60 bg-sky-50 text-sky-900 dark:border-sky-700/60 dark:bg-sky-950/40 dark:text-sky-100'
      : 'border-violet-300/60 bg-violet-50 text-violet-900 dark:border-violet-700/60 dark:bg-violet-950/40 dark:text-violet-100';

  return (
    <span className={`rounded-full border px-2.5 py-0.5 text-xs ${classes}`}>
      {label}
    </span>
  );
}

export function CompanyNotebook({
  companyId,
  initialNotes,
  moatPatterns,
  businessModels,
}: CompanyNotebookProps) {
  const router = useRouter();
  const [notes, setNotes] = useState(initialNotes);
  const [draft, setDraft] = useState<NoteDraft>(EMPTY_DRAFT);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestMessage, setSuggestMessage] = useState<string | null>(null);
  const [suggestRationale, setSuggestRationale] = useState<string | null>(null);
  const [aiPrefilled, setAiPrefilled] = useState(false);
  const [pendingAiAudit, setPendingAiAudit] = useState<NoteAiAuditPayload | null>(
    null,
  );

  useEffect(() => {
    setNotes(initialNotes);
  }, [initialNotes]);

  const editingNote = useMemo(
    () => notes.find((note) => note.id === editingNoteId) ?? null,
    [editingNoteId, notes],
  );
  const canSuggestTags = isTagSuggestBodyReady(draft.body);

  function clearSuggestionState() {
    setSuggestMessage(null);
    setSuggestRationale(null);
    setAiPrefilled(false);
    setPendingAiAudit(null);
  }

  function resetForm() {
    setDraft(EMPTY_DRAFT);
    setEditingNoteId(null);
    setFormError(null);
    clearSuggestionState();
  }

  function startEditing(note: NoteView) {
    setEditingNoteId(note.id);
    setDraft({
      body: note.body,
      moatPattern: note.moatPattern ?? '',
      businessModel: note.businessModel ?? '',
    });
    setFormError(null);
    clearSuggestionState();
  }

  async function handleSuggestTags() {
    if (isSuggesting || !canSuggestTags) {
      return;
    }

    setIsSuggesting(true);
    setSuggestMessage(null);
    setSuggestRationale(null);

    try {
      const response = await fetch('/api/tag-suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ noteText: draft.body }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          message?: string;
        } | null;
        throw new Error(body?.message ?? 'Could not suggest tags');
      }

      const suggestion = (await response.json()) as TagSuggestResponse;
      if (isTagSuggestUnavailable(suggestion)) {
        setSuggestMessage('Suggestion unavailable — choose tags manually.');
        setAiPrefilled(false);
        setPendingAiAudit(null);
        return;
      }

      setDraft((current) => ({
        ...current,
        moatPattern: suggestion.moatPattern ?? '',
        businessModel: suggestion.businessModel ?? '',
      }));
      setPendingAiAudit({
        suggestedMoatPattern: suggestion.moatPattern,
        suggestedBusinessModel: suggestion.businessModel,
      });
      setAiPrefilled(true);
      setSuggestRationale(suggestion.rationale ?? null);
      setSuggestMessage('AI suggestion applied — review before saving.');
    } catch (suggestError) {
      setSuggestMessage(
        suggestError instanceof Error
          ? suggestError.message
          : 'Suggestion unavailable — choose tags manually.',
      );
      setAiPrefilled(false);
      setPendingAiAudit(null);
    } finally {
      setIsSuggesting(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSaving) {
      return;
    }

    setIsSaving(true);
    setFormError(null);

    const payload = {
      body: draft.body,
      moatPattern: draft.moatPattern || null,
      businessModel: draft.businessModel || null,
      ...(pendingAiAudit ? { aiAudit: pendingAiAudit } : {}),
    };

    try {
      if (editingNoteId) {
        const response = await fetch(`/api/notes/${editingNoteId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as {
            message?: string;
          } | null;
          throw new Error(body?.message ?? 'Could not update note');
        }

        const updated = (await response.json()) as NoteView;
        setNotes((current) =>
          current
            .map((note) => (note.id === updated.id ? updated : note))
            .sort(
              (left, right) =>
                new Date(right.createdAt).getTime() -
                new Date(left.createdAt).getTime(),
            ),
        );
      } else {
        const response = await fetch(`/api/companies/${companyId}/notes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            body: payload.body,
            ...(payload.moatPattern ? { moatPattern: payload.moatPattern } : {}),
            ...(payload.businessModel
              ? { businessModel: payload.businessModel }
              : {}),
            ...(pendingAiAudit ? { aiAudit: pendingAiAudit } : {}),
          }),
        });

        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as {
            message?: string;
          } | null;
          throw new Error(body?.message ?? 'Could not create note');
        }

        const created = (await response.json()) as NoteView;
        setNotes((current) => [created, ...current]);
      }

      resetForm();
      router.refresh();
    } catch (submitError) {
      setFormError(
        submitError instanceof Error ? submitError.message : 'Could not save note',
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(noteId: string) {
    if (deletingNoteId) {
      return;
    }

    setDeletingNoteId(noteId);
    setFormError(null);

    try {
      const response = await fetch(`/api/notes/${noteId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          message?: string;
        } | null;
        throw new Error(body?.message ?? 'Could not delete note');
      }

      setNotes((current) => current.filter((note) => note.id !== noteId));
      if (editingNoteId === noteId) {
        resetForm();
      }
      router.refresh();
    } catch (deleteError) {
      setFormError(
        deleteError instanceof Error ? deleteError.message : 'Could not delete note',
      );
    } finally {
      setDeletingNoteId(null);
    }
  }

  return (
    <section className="flex flex-col gap-6 border-t border-black/10 pt-6 dark:border-white/10">
      <div>
        <h2 className="text-xl font-semibold">Research notes</h2>
        <p className="text-muted mt-1 text-sm">
          Capture observations and optionally tag moat pattern and business model.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label htmlFor="note-body" className="text-muted mb-1 block text-sm">
            Note
          </label>
          <textarea
            id="note-body"
            value={draft.body}
            onChange={(event) =>
              setDraft((current) => ({ ...current, body: event.target.value }))
            }
            rows={5}
            placeholder="What did you observe?"
            className="w-full rounded-md border border-black/10 bg-transparent px-3 py-2 text-sm outline-none focus:border-black/30 dark:border-white/15 dark:focus:border-white/30"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleSuggestTags}
            disabled={!canSuggestTags || isSuggesting}
            className="rounded-md border border-black/10 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/15"
          >
            {isSuggesting ? 'Suggesting tags…' : 'Suggest tags'}
          </button>
          {!canSuggestTags && draft.body.trim().length > 0 && (
            <p className="text-muted text-xs">
              Add a bit more detail before requesting a suggestion.
            </p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="note-moat" className="text-muted mb-1 block text-sm">
              Moat pattern (optional)
              {aiPrefilled && (
                <span className="text-muted ml-2 text-xs">AI pre-filled</span>
              )}
            </label>
            <select
              id="note-moat"
              value={draft.moatPattern}
              disabled={isSuggesting}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  moatPattern: event.target.value,
                }))
              }
              className="w-full rounded-md border border-black/10 bg-transparent px-3 py-2 text-sm outline-none focus:border-black/30 disabled:opacity-60 dark:border-white/15 dark:focus:border-white/30"
            >
              <option value="">None</option>
              {moatPatterns.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="note-business-model"
              className="text-muted mb-1 block text-sm"
            >
              Business model (optional)
              {aiPrefilled && (
                <span className="text-muted ml-2 text-xs">AI pre-filled</span>
              )}
            </label>
            <select
              id="note-business-model"
              value={draft.businessModel}
              disabled={isSuggesting}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  businessModel: event.target.value,
                }))
              }
              className="w-full rounded-md border border-black/10 bg-transparent px-3 py-2 text-sm outline-none focus:border-black/30 disabled:opacity-60 dark:border-white/15 dark:focus:border-white/30"
            >
              <option value="">None</option>
              {businessModels.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {suggestRationale && (
          <p className="text-muted text-xs">{suggestRationale}</p>
        )}
        {suggestMessage && (
          <p className="text-muted text-sm">{suggestMessage}</p>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-md bg-foreground px-4 py-2 text-sm text-background disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving
              ? 'Saving…'
              : editingNote
                ? 'Save changes'
                : 'Add note'}
          </button>
          {editingNote && (
            <button
              type="button"
              onClick={resetForm}
              className="text-muted text-sm hover:underline"
            >
              Cancel edit
            </button>
          )}
        </div>

        {formError && (
          <p className="text-sm text-red-600 dark:text-red-400">{formError}</p>
        )}
      </form>

      {notes.length === 0 ? (
        <p className="text-muted text-sm">No notes yet. Add your first observation above.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {notes.map((note) => {
            const moatLabel = labelForOption(moatPatterns, note.moatPattern);
            const businessLabel = labelForOption(businessModels, note.businessModel);

            return (
              <li
                key={note.id}
                className="rounded-md border border-black/10 p-4 dark:border-white/15"
              >
                <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                  <p className="text-muted text-xs">
                    {formatNoteTimestamp(note.createdAt)}
                    {note.updatedAt !== note.createdAt && ' · edited'}
                  </p>
                  <div className="flex items-center gap-3 text-sm">
                    <button
                      type="button"
                      onClick={() => startEditing(note)}
                      className="text-muted hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(note.id)}
                      disabled={deletingNoteId === note.id}
                      className="text-red-600 hover:underline disabled:opacity-60 dark:text-red-400"
                    >
                      {deletingNoteId === note.id ? 'Deleting…' : 'Delete'}
                    </button>
                  </div>
                </div>

                <p className="whitespace-pre-wrap text-sm leading-6">{note.body}</p>

                {(moatLabel || businessLabel) && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {moatLabel && <TagBadge label={moatLabel} variant="moat" />}
                    {businessLabel && (
                      <TagBadge label={businessLabel} variant="business" />
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
