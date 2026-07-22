import { NextRequest, NextResponse } from 'next/server';
import {
  normalizeTagSuggestInput,
  unavailableTagSuggestResponse,
} from '@/lib/ai/tag-suggest.constants';
import { suggestTagsFromNoteText } from '@/lib/ai/tag-suggest.service';

export async function POST(request: NextRequest) {
  let noteText: unknown;
  try {
    const body = (await request.json()) as { noteText?: unknown };
    noteText = body.noteText;
  } catch {
    return NextResponse.json({ message: 'Invalid request body' }, { status: 400 });
  }

  const normalized = normalizeTagSuggestInput(noteText);
  if (!normalized.ok) {
    return NextResponse.json(
      { message: normalized.message },
      { status: normalized.status },
    );
  }

  try {
    const suggestion = await suggestTagsFromNoteText(normalized.noteText);
    return NextResponse.json(suggestion);
  } catch {
    return NextResponse.json(unavailableTagSuggestResponse());
  }
}
