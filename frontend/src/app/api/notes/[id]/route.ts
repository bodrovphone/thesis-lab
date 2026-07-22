import { NextRequest, NextResponse } from 'next/server';
import {
  BackendApiError,
  deleteNote,
  isForwardableBackendStatus,
  updateNote,
} from '@/lib/api/backend-client';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  let payload: {
    body?: unknown;
    moatPattern?: unknown;
    businessModel?: unknown;
    aiAudit?: unknown;
  };
  try {
    payload = (await request.json()) as {
      body?: unknown;
      moatPattern?: unknown;
      businessModel?: unknown;
      aiAudit?: unknown;
    };
  } catch {
    return NextResponse.json({ message: 'Invalid request body' }, { status: 400 });
  }

  const input: {
    body?: string;
    moatPattern?: string | null;
    businessModel?: string | null;
    aiAudit?: {
      suggestedMoatPattern: string | null;
      suggestedBusinessModel: string | null;
    };
  } = {};

  if (payload.body !== undefined) {
    if (typeof payload.body !== 'string') {
      return NextResponse.json({ message: 'Invalid body' }, { status: 400 });
    }
    input.body = payload.body;
  }

  if (payload.moatPattern !== undefined) {
    if (payload.moatPattern !== null && typeof payload.moatPattern !== 'string') {
      return NextResponse.json({ message: 'Invalid moatPattern' }, { status: 400 });
    }
    input.moatPattern = payload.moatPattern;
  }

  if (payload.businessModel !== undefined) {
    if (payload.businessModel !== null && typeof payload.businessModel !== 'string') {
      return NextResponse.json({ message: 'Invalid businessModel' }, { status: 400 });
    }
    input.businessModel = payload.businessModel;
  }

  if (payload.aiAudit !== undefined) {
    if (payload.aiAudit === null || typeof payload.aiAudit !== 'object') {
      return NextResponse.json({ message: 'Invalid aiAudit' }, { status: 400 });
    }
    const audit = payload.aiAudit as {
      suggestedMoatPattern?: unknown;
      suggestedBusinessModel?: unknown;
    };
    input.aiAudit = {
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

  try {
    const note = await updateNote(id, input);
    return NextResponse.json(note);
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

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  try {
    await deleteNote(id);
    return new NextResponse(null, { status: 204 });
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
