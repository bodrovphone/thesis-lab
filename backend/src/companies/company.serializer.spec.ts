import type { Company, Note } from '../generated/prisma/client';
import { NoteSerializer } from '../notes/note.serializer';
import { CompanySerializer } from './company.serializer';

function makeCompany(overrides: Partial<Company> = {}): Company {
  return {
    id: 'c1',
    ticker: 'AAPL',
    name: 'Apple Inc.',
    cik: '0000320193',
    exchange: 'Nasdaq',
    sector: null,
    industry: 'Electronic Computers',
    description: null,
    country: null,
    marketCapUsd: null,
    website: null,
    logoUrl: null,
    convictionLevel: 'WATCHING',
    sourcesUsed: ['SEC_EDGAR'],
    enrichmentStatus: 'COMPLETE',
    lastEnrichedAt: new Date('2026-07-22T00:00:00.000Z'),
    currentThinkingSummary: null,
    summaryGeneratedAt: null,
    createdAt: new Date('2026-07-22T00:00:00.000Z'),
    updatedAt: new Date('2026-07-22T01:00:00.000Z'),
    ...overrides,
  };
}

function makeNote(overrides: Partial<Note> = {}): Note {
  return {
    id: 'n1',
    companyId: 'c1',
    body: 'Strong network effects',
    moatPattern: 'NETWORK_EFFECTS',
    businessModel: 'B2B_SOFTWARE',
    aiSuggestedMoatPattern: null,
    aiSuggestedBusinessModel: null,
    tagEditedByUser: null,
    createdAt: new Date('2026-07-22T02:00:00.000Z'),
    updatedAt: new Date('2026-07-22T02:00:00.000Z'),
    ...overrides,
  };
}

describe('CompanySerializer', () => {
  const serializer = new CompanySerializer(new NoteSerializer());

  it('serializes BigInt marketCapUsd to a decimal string', () => {
    const view = serializer.toView(
      makeCompany({ marketCapUsd: 3_000_000_000_000n }),
    );

    expect(view.marketCapUsd).toBe('3000000000000');
  });

  it('serializes Date fields to ISO 8601 strings', () => {
    const view = serializer.toView(makeCompany());

    expect(view.createdAt).toBe('2026-07-22T00:00:00.000Z');
    expect(view.updatedAt).toBe('2026-07-22T01:00:00.000Z');
    expect(view.lastEnrichedAt).toBe('2026-07-22T00:00:00.000Z');
  });

  it('passes through null optional fields as null', () => {
    const view = serializer.toView(
      makeCompany({
        marketCapUsd: null,
        lastEnrichedAt: null,
        summaryGeneratedAt: null,
      }),
    );

    expect(view.marketCapUsd).toBeNull();
    expect(view.lastEnrichedAt).toBeNull();
    expect(view.summaryGeneratedAt).toBeNull();
  });

  it('includes notes when provided', () => {
    const view = serializer.toView(makeCompany(), [makeNote()]);

    expect(view.notes).toEqual([
      {
        id: 'n1',
        companyId: 'c1',
        body: 'Strong network effects',
        moatPattern: 'NETWORK_EFFECTS',
        businessModel: 'B2B_SOFTWARE',
        createdAt: '2026-07-22T02:00:00.000Z',
        updatedAt: '2026-07-22T02:00:00.000Z',
      },
    ]);
  });

  it('never leaks the underlying Prisma entity shape untransformed', () => {
    const company = makeCompany({ marketCapUsd: 42n });
    const view = serializer.toView(company);

    expect(typeof view.marketCapUsd).toBe('string');
    expect(typeof view.createdAt).toBe('string');
  });
});
