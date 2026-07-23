import { describe, expect, it } from 'vitest';
import { buildSummaryPrompt, capNoteHistory } from './cap-note-history';

describe('capNoteHistory', () => {
  const notes = [
    { id: 'n1', body: 'Older note', createdAt: '2026-01-01T00:00:00.000Z' },
    { id: 'n2', body: 'Middle note', createdAt: '2026-01-02T00:00:00.000Z' },
    { id: 'n3', body: 'Newest note', createdAt: '2026-01-03T00:00:00.000Z' },
  ];

  it('keeps all notes when under budget', () => {
    const result = capNoteHistory(notes, 1000);
    expect(result.omittedCount).toBe(0);
    expect(result.notes.map((note) => note.id)).toEqual(['n1', 'n2', 'n3']);
  });

  it('retains newest notes first and re-sorts chronologically', () => {
    const result = capNoteHistory(notes, 22);
    expect(result.omittedCount).toBe(1);
    expect(result.notes.map((note) => note.id)).toEqual(['n2', 'n3']);
  });

  it('truncates a single oversized note instead of omitting it', () => {
    const result = capNoteHistory(
      [{ id: 'n1', body: 'abcdefghij', createdAt: '2026-01-01T00:00:00.000Z' }],
      5,
    );
    expect(result.notes).toHaveLength(1);
    expect(result.notes[0]?.body).toBe('abcde');
    expect(result.truncatedNoteIds).toEqual(['n1']);
  });

  it('includes omission signaling in the prompt', () => {
    const capped = capNoteHistory(notes, 22);
    const prompt = buildSummaryPrompt('Acme Corp', capped);
    expect(prompt).toContain('Acme Corp');
    expect(prompt).toContain('Earlier notes omitted for length');
    expect(prompt).toContain('Middle note');
  });
});
