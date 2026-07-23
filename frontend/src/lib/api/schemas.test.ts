import { describe, expect, it } from 'vitest';
import { companyViewSchema, noteViewSchema } from './schemas';

function validCompany() {
  return {
    id: 'c1',
    ticker: 'ACME',
    name: 'Acme Corp',
    cik: null,
    exchange: 'NASDAQ',
    sector: null,
    industry: null,
    description: null,
    country: null,
    marketCapUsd: null,
    website: null,
    logoUrl: null,
    convictionLevel: 'WATCHING',
    sourcesUsed: ['SEC_EDGAR'],
    enrichmentStatus: 'COMPLETE',
    lastEnrichedAt: null,
    currentThinkingSummary: null,
    summaryGeneratedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('companyViewSchema', () => {
  it('accepts a well-formed backend payload', () => {
    const result = companyViewSchema.safeParse(validCompany());
    expect(result.success).toBe(true);
  });

  it('accepts an optional notes array when present', () => {
    const result = companyViewSchema.safeParse({
      ...validCompany(),
      notes: [
        {
          id: 'n1',
          companyId: 'c1',
          body: 'note',
          moatPattern: null,
          businessModel: null,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rejects an unrecognized convictionLevel', () => {
    const result = companyViewSchema.safeParse({
      ...validCompany(),
      convictionLevel: 'SUPER_CONVICTION',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a missing required field', () => {
    const payload: Record<string, unknown> = validCompany();
    delete payload.id;
    const result = companyViewSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it('rejects a non-array sourcesUsed', () => {
    const result = companyViewSchema.safeParse({
      ...validCompany(),
      sourcesUsed: 'SEC_EDGAR',
    });
    expect(result.success).toBe(false);
  });
});

describe('noteViewSchema', () => {
  it('accepts null moatPattern and businessModel', () => {
    const result = noteViewSchema.safeParse({
      id: 'n1',
      companyId: 'c1',
      body: 'note body',
      moatPattern: null,
      businessModel: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    expect(result.success).toBe(true);
  });

  it('rejects an unrecognized moatPattern', () => {
    const result = noteViewSchema.safeParse({
      id: 'n1',
      companyId: 'c1',
      body: 'note body',
      moatPattern: 'MADE_UP_PATTERN',
      businessModel: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    expect(result.success).toBe(false);
  });
});
