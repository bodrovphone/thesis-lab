import type { Company } from '../generated/prisma/client';
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

describe('CompanySerializer', () => {
  it('serializes BigInt marketCapUsd to a decimal string', () => {
    const serializer = new CompanySerializer();
    const view = serializer.toView(
      makeCompany({ marketCapUsd: 3_000_000_000_000n }),
    );

    expect(view.marketCapUsd).toBe('3000000000000');
  });

  it('serializes Date fields to ISO 8601 strings', () => {
    const serializer = new CompanySerializer();
    const view = serializer.toView(makeCompany());

    expect(view.createdAt).toBe('2026-07-22T00:00:00.000Z');
    expect(view.updatedAt).toBe('2026-07-22T01:00:00.000Z');
    expect(view.lastEnrichedAt).toBe('2026-07-22T00:00:00.000Z');
  });

  it('passes through null optional fields as null', () => {
    const serializer = new CompanySerializer();
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

  it('never leaks the underlying Prisma entity shape untransformed', () => {
    const serializer = new CompanySerializer();
    const company = makeCompany({ marketCapUsd: 42n });
    const view = serializer.toView(company);

    expect(typeof view.marketCapUsd).toBe('string');
    expect(typeof view.createdAt).toBe('string');
  });
});
