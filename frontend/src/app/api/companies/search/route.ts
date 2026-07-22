import { NextRequest, NextResponse } from 'next/server';
import {
  BackendApiError,
  isForwardableBackendStatus,
  searchCompanies,
} from '@/lib/api/backend-client';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const q = searchParams.get('q') ?? '';
  const limitParam = searchParams.get('limit');
  const limit = limitParam !== null ? Number(limitParam) : undefined;

  try {
    const items = await searchCompanies(q, limit);
    return NextResponse.json({ items });
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
