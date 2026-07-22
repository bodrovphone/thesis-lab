import { NextRequest, NextResponse } from 'next/server';
import { getCompany } from '@/lib/api/backend-client';
import { summarizeCompanyNotes } from '@/lib/ai/summarize.service';
import { isSummarizeError } from '@/lib/ai/summarize.constants';

export async function POST(request: NextRequest) {
  let companyId: unknown;
  try {
    const body = (await request.json()) as { companyId?: unknown };
    companyId = body.companyId;
  } catch {
    return NextResponse.json({ message: 'Invalid request body' }, { status: 400 });
  }

  if (typeof companyId !== 'string' || !companyId.trim()) {
    return NextResponse.json({ message: 'companyId is required' }, { status: 400 });
  }

  const company = await getCompany(companyId);
  if (!company) {
    return NextResponse.json({ message: 'Company not found' }, { status: 404 });
  }

  const notes = (company.notes ?? []).map((note) => ({
    id: note.id,
    body: note.body,
    createdAt: note.createdAt,
  }));

  const result = await summarizeCompanyNotes(company.name, notes);
  if (isSummarizeError(result)) {
    const status = result.error === 'nothing_to_summarize' ? 400 : 200;
    return NextResponse.json(result, { status });
  }

  return NextResponse.json(result);
}
