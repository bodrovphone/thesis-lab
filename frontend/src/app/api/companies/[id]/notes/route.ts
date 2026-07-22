import { NextRequest, NextResponse } from 'next/server';
import {
  BackendApiError,
  createNote,
  isForwardableBackendStatus,
} from '@/lib/api/backend-client';

function parseAiAudit(value: unknown):
  | {
      suggestedMoatPattern: string | null;
      suggestedBusinessModel: string | null;
    }
  | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== 'object') {
    throw new Error('Invalid aiAudit');
  }

  const audit = value as {
    suggestedMoatPattern?: unknown;
    suggestedBusinessModel?: unknown;
  };

  return {
    suggestedMoatPattern:
      audit.suggestedMoatPattern === null
        ? null
        : typeof audit.suggestedMoatPattern === 'string'
          ? audit.suggestedMoatPattern
          : null,
    suggestedBusinessModel:
      audit.suggestedBusinessModel === null
        ? null
        : typeof audit.suggestedBusinessModel === 'string'
          ? audit.suggestedBusinessModel
          : null,
  };
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  let body: unknown;
  let moatPattern: unknown;
  let businessModel: unknown;
  let aiAudit: unknown;
  try {
    const payload = (await request.json()) as {
      body?: unknown;
      moatPattern?: unknown;
      businessModel?: unknown;
      aiAudit?: unknown;
    };
    body = payload.body;
    moatPattern = payload.moatPattern;
    businessModel = payload.businessModel;
    aiAudit = payload.aiAudit;
  } catch {
    return NextResponse.json({ message: 'Invalid request body' }, { status: 400 });
  }

  if (typeof body !== 'string') {
    return NextResponse.json({ message: 'body is required' }, { status: 400 });
  }

  const input: {
    body: string;
    moatPattern?: string;
    businessModel?: string;
    aiAudit?: {
      suggestedMoatPattern: string | null;
      suggestedBusinessModel: string | null;
    };
  } = { body };

  if (moatPattern !== undefined && moatPattern !== null && moatPattern !== '') {
    if (typeof moatPattern !== 'string') {
      return NextResponse.json({ message: 'Invalid moatPattern' }, { status: 400 });
    }
    input.moatPattern = moatPattern;
  }

  if (businessModel !== undefined && businessModel !== null && businessModel !== '') {
    if (typeof businessModel !== 'string') {
      return NextResponse.json({ message: 'Invalid businessModel' }, { status: 400 });
    }
    input.businessModel = businessModel;
  }

  try {
    input.aiAudit = parseAiAudit(aiAudit);
  } catch {
    return NextResponse.json({ message: 'Invalid aiAudit' }, { status: 400 });
  }

  try {
    const note = await createNote(id, input);
    return NextResponse.json(note, { status: 201 });
  } catch (error) {
    if (error instanceof BackendApiError && isForwardableBackendStatus(error.status)) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { message: 'Backend service unavailable' },
      { status: 502 },
    );
  }
}
