import { mergeCompanyProfile } from './merge-company-profile';
import type {
  AdapterResult,
  CompanySearchCandidate,
  NormalizedCompanyProfile,
} from '../types/company-data.types';

const candidate: CompanySearchCandidate = {
  ticker: 'AAPL',
  name: 'Apple Inc.',
  cik: '0000320193',
  exchange: 'Nasdaq',
  sources: ['SEC_EDGAR', 'FINNHUB'],
};

const secProfile: NormalizedCompanyProfile = {
  ticker: 'AAPL',
  name: 'Apple Inc.',
  cik: '0000320193',
  exchange: 'Nasdaq',
  industry: 'Electronic Computers',
  country: null,
  marketCapUsd: null,
  website: null,
  logoUrl: null,
};

const finnhubProfile: NormalizedCompanyProfile = {
  ticker: 'AAPL',
  name: 'Apple Inc',
  cik: null,
  exchange: 'NASDAQ',
  industry: 'Technology',
  country: 'US',
  marketCapUsd: 3_000_000_000_000n,
  website: 'https://apple.com',
  logoUrl:
    'https://static2.finnhub.io/file/publicdatany/finnhubimage/stock_logo/AAPL.png',
};

const now = new Date('2026-07-23T00:00:00.000Z');

describe('mergeCompanyProfile', () => {
  it('merges COMPLETE profiles with Finnhub display precedence', () => {
    const results: AdapterResult<NormalizedCompanyProfile>[] = [
      { source: 'SEC_EDGAR', status: 'ok', data: secProfile },
      { source: 'FINNHUB', status: 'ok', data: finnhubProfile },
    ];

    expect(mergeCompanyProfile(candidate, results, now)).toEqual({
      ticker: 'AAPL',
      name: 'Apple Inc',
      cik: '0000320193',
      exchange: 'NASDAQ',
      industry: 'Technology',
      country: 'US',
      marketCapUsd: 3_000_000_000_000n,
      website: 'https://apple.com',
      logoUrl: finnhubProfile.logoUrl,
      sourcesUsed: ['SEC_EDGAR', 'FINNHUB'],
      enrichmentStatus: 'COMPLETE',
      lastEnrichedAt: now,
    });
  });

  it('returns PARTIAL when only SEC succeeds', () => {
    const results: AdapterResult<NormalizedCompanyProfile>[] = [
      { source: 'SEC_EDGAR', status: 'ok', data: secProfile },
      {
        source: 'FINNHUB',
        status: 'disabled',
        message: 'Finnhub adapter is disabled',
      },
    ];

    expect(mergeCompanyProfile(candidate, results, now)).toMatchObject({
      name: 'Apple Inc.',
      cik: '0000320193',
      industry: 'Electronic Computers',
      country: null,
      enrichmentStatus: 'PARTIAL',
      sourcesUsed: ['SEC_EDGAR', 'FINNHUB'],
      lastEnrichedAt: now,
    });
  });

  it('returns PARTIAL Finnhub-shaped data when SEC fails', () => {
    const finnhubOnlyCandidate: CompanySearchCandidate = {
      ticker: 'FOO',
      name: 'Foo Corp',
      cik: null,
      exchange: null,
      sources: ['FINNHUB'],
    };
    const results: AdapterResult<NormalizedCompanyProfile>[] = [
      {
        source: 'SEC_EDGAR',
        status: 'error',
        message: 'SEC profile requires CIK',
      },
      {
        source: 'FINNHUB',
        status: 'ok',
        data: {
          ...finnhubProfile,
          ticker: 'FOO',
          name: 'Foo Corp',
        },
      },
    ];

    expect(
      mergeCompanyProfile(finnhubOnlyCandidate, results, now),
    ).toMatchObject({
      ticker: 'FOO',
      name: 'Foo Corp',
      cik: null,
      enrichmentStatus: 'PARTIAL',
      sourcesUsed: ['FINNHUB'],
    });
  });

  it('returns FAILED when both profiles fail', () => {
    const results: AdapterResult<NormalizedCompanyProfile>[] = [
      {
        source: 'SEC_EDGAR',
        status: 'timeout',
        message: 'SEC request timed out',
      },
      { source: 'FINNHUB', status: 'error', message: 'Finnhub request failed' },
    ];

    expect(mergeCompanyProfile(candidate, results, now)).toMatchObject({
      ticker: 'AAPL',
      name: 'Apple Inc.',
      cik: '0000320193',
      enrichmentStatus: 'FAILED',
      lastEnrichedAt: null,
      sourcesUsed: ['SEC_EDGAR', 'FINNHUB'],
    });
  });
});
