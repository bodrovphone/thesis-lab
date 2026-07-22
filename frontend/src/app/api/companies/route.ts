import { NextRequest, NextResponse } from 'next/server';
import {
  BackendApiError,
  createCompany,
  isForwardableBackendStatus,
} from '@/lib/api/backend-client';

export async function POST(request: NextRequest) {
  let ticker: unknown;
  try {
    const body = (await request.json()) as { ticker?: unknown };
    ticker = body.ticker;
  } catch {
    return NextResponse.json({ message: 'Invalid request body' }, { status: 400 });
  }

  if (typeof ticker !== 'string') {
    return NextResponse.json({ message: 'ticker is required' }, { status: 400 });
  }

  try {
    const company = await createCompany(ticker);
    return NextResponse.json(company, { status: 201 });
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
