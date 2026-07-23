import type { MergedCompanyProfile } from '../company-data/types/company-data.types';
import { DataSource, EnrichmentStatus } from '../generated/prisma/client';
import {
  toCompanyCreateData,
  toCompanyEnrichmentUpdateData,
} from './company-write-data';

const merged: MergedCompanyProfile = {
  ticker: 'AAPL',
  name: 'Apple Inc.',
  cik: '0000320193',
  exchange: 'Nasdaq',
  sector: 'Technology',
  industry: 'Consumer Electronics',
  description: 'Makes phones',
  country: 'US',
  marketCapUsd: 1_000n,
  website: 'https://apple.com',
  logoUrl: 'https://example.com/logo.png',
  sourcesUsed: ['SEC_EDGAR', 'FINNHUB'],
  enrichmentStatus: 'COMPLETE',
  lastEnrichedAt: new Date('2026-01-01T00:00:00.000Z'),
};

describe('company-write-data', () => {
  it('includes ticker on create and maps sources/enums', () => {
    expect(toCompanyCreateData(merged)).toEqual(
      expect.objectContaining({
        ticker: 'AAPL',
        name: 'Apple Inc.',
        marketCapUsd: 1_000n,
        sourcesUsed: [DataSource.SEC_EDGAR, DataSource.FINNHUB],
        enrichmentStatus: EnrichmentStatus.COMPLETE,
      }),
    );
  });

  it('omits ticker on enrichment update payloads', () => {
    const update = toCompanyEnrichmentUpdateData(merged);
    expect(update).not.toHaveProperty('ticker');
    expect(update).toEqual(
      expect.objectContaining({
        name: 'Apple Inc.',
        sourcesUsed: [DataSource.SEC_EDGAR, DataSource.FINNHUB],
      }),
    );
  });
});
