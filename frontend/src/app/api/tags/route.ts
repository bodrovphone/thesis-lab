import { NextResponse } from 'next/server';
import { BackendApiError, getTags, isForwardableBackendStatus } from '@/lib/api/backend-client';

export async function GET() {
  try {
    const tags = await getTags();
    return NextResponse.json(tags);
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
