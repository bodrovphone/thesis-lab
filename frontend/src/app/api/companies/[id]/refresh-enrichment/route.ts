import { NextResponse } from 'next/server';
import { BackendApiError, isForwardableBackendStatus, refreshCompanyEnrichment } from '@/lib/api/backend-client';

export async function POST(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    return NextResponse.json(await refreshCompanyEnrichment(id));
  } catch (error) {
    if (error instanceof BackendApiError && isForwardableBackendStatus(error.status)) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: 'Backend service unavailable' }, { status: 502 });
  }
}
