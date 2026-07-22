import { NextRequest, NextResponse } from 'next/server';
import {
  BackendApiError,
  isForwardableBackendStatus,
  updateCompanySummary,
} from '@/lib/api/backend-client';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  let currentThinkingSummary: unknown;
  try {
    const body = (await request.json()) as { currentThinkingSummary?: unknown };
    currentThinkingSummary = body.currentThinkingSummary;
  } catch {
    return NextResponse.json({ message: 'Invalid request body' }, { status: 400 });
  }

  if (typeof currentThinkingSummary !== 'string' || !currentThinkingSummary.trim()) {
    return NextResponse.json(
      { message: 'currentThinkingSummary is required' },
      { status: 400 },
    );
  }

  try {
    const company = await updateCompanySummary(id, currentThinkingSummary);
    return NextResponse.json(company);
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
