import { NextRequest, NextResponse } from 'next/server';
import {
  BackendApiError,
  isForwardableBackendStatus,
  updateCompanyConviction,
} from '@/lib/api/backend-client';
import type { ConvictionLevel } from '@/types/company';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  let convictionLevel: unknown;
  try {
    const body = (await request.json()) as { convictionLevel?: unknown };
    convictionLevel = body.convictionLevel;
  } catch {
    return NextResponse.json({ message: 'Invalid request body' }, { status: 400 });
  }

  if (typeof convictionLevel !== 'string') {
    return NextResponse.json(
      { message: 'convictionLevel is required' },
      { status: 400 },
    );
  }

  try {
    const company = await updateCompanyConviction(id, convictionLevel as ConvictionLevel);
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
