export interface NoteForSummary {
  id: string;
  body: string;
  createdAt: string;
}

export interface CappedNoteHistory {
  notes: NoteForSummary[];
  omittedCount: number;
  truncatedNoteIds: string[];
}

export function capNoteHistory(
  notes: NoteForSummary[],
  budget: number,
): CappedNoteHistory {
  if (notes.length === 0) {
    return { notes: [], omittedCount: 0, truncatedNoteIds: [] };
  }

  const newestFirst = [...notes].sort(
    (left, right) =>
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );

  const retained: NoteForSummary[] = [];
  let usedChars = 0;
  const truncatedNoteIds: string[] = [];

  for (const note of newestFirst) {
    if (retained.length === 0 && note.body.length > budget) {
      retained.push({
        ...note,
        body: note.body.slice(0, budget),
      });
      truncatedNoteIds.push(note.id);
      break;
    }

    if (usedChars + note.body.length <= budget) {
      retained.push(note);
      usedChars += note.body.length;
      continue;
    }

    break;
  }

  const chronological = retained.sort(
    (left, right) =>
      new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
  );

  return {
    notes: chronological,
    omittedCount: notes.length - retained.length,
    truncatedNoteIds,
  };
}

export function buildSummaryPrompt(
  companyName: string,
  capped: CappedNoteHistory,
): string {
  const lines = [`Company: ${companyName}`, ''];

  if (capped.omittedCount > 0) {
    lines.push(
      `[Earlier notes omitted for length — ${capped.omittedCount} older note(s) not included below]`,
      '',
    );
  }

  for (const note of capped.notes) {
    lines.push(`--- Note (${note.createdAt}) ---`, note.body, '');
  }

  return lines.join('\n').trim();
}
