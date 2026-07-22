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
  sector: null,
  industry: 'Electronic Computers',
  description: null,
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
  sector: null,
  industry: 'Technology',
  description: null,
  country: 'US',
  marketCapUsd: 3_000_000_000_000n,
  website: 'https://apple.com',
  logoUrl:
    'https://static2.finnhub.io/file/publicdatany/finnhubimage/stock_logo/AAPL.png',
};

const alphaVantageProfile: NormalizedCompanyProfile = {
  ticker: 'AAPL',
  name: 'Apple Inc',
  cik: null,
  exchange: 'NASDAQ',
  sector: 'TECHNOLOGY',
  industry: 'CONSUMER ELECTRONICS',
  description: 'Designs consumer electronics.',
  country: 'USA',
  marketCapUsd: 2_900_000_000_000n,
  website: null,
  logoUrl: null,
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
      sector: null,
      industry: 'Technology',
      description: null,
      country: 'US',
      marketCapUsd: 3_000_000_000_000n,
      website: 'https://apple.com',
      logoUrl: finnhubProfile.logoUrl,
      sourcesUsed: ['SEC_EDGAR', 'FINNHUB'],
      enrichmentStatus: 'COMPLETE',
      lastEnrichedAt: now,
    });
  });

  it('prefers Alpha Vantage description, sector, and industry when present', () => {
    const results: AdapterResult<NormalizedCompanyProfile>[] = [
      { source: 'SEC_EDGAR', status: 'ok', data: secProfile },
      { source: 'FINNHUB', status: 'ok', data: finnhubProfile },
      { source: 'ALPHA_VANTAGE', status: 'ok', data: alphaVantageProfile },
    ];

    expect(mergeCompanyProfile(candidate, results, now)).toMatchObject({
      sector: 'TECHNOLOGY',
      industry: 'CONSUMER ELECTRONICS',
      description: 'Designs consumer electronics.',
      country: 'US',
      marketCapUsd: 3_000_000_000_000n,
      sourcesUsed: ['SEC_EDGAR', 'FINNHUB', 'ALPHA_VANTAGE'],
      enrichmentStatus: 'COMPLETE',
    });
  });

  it('keeps COMPLETE enrichment when Alpha Vantage fails but core sources succeed', () => {
    const results: AdapterResult<NormalizedCompanyProfile>[] = [
      { source: 'SEC_EDGAR', status: 'ok', data: secProfile },
      { source: 'FINNHUB', status: 'ok', data: finnhubProfile },
      {
        source: 'ALPHA_VANTAGE',
        status: 'rate_limited',
        message: 'Alpha Vantage daily budget exhausted',
      },
    ];

    expect(mergeCompanyProfile(candidate, results, now)).toMatchObject({
      enrichmentStatus: 'COMPLETE',
      sourcesUsed: ['SEC_EDGAR', 'FINNHUB'],
      description: null,
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

  it('returns PARTIAL Alpha Vantage data when core sources fail', () => {
    const results: AdapterResult<NormalizedCompanyProfile>[] = [
      {
        source: 'SEC_EDGAR',
        status: 'timeout',
        message: 'SEC request timed out',
      },
      { source: 'FINNHUB', status: 'error', message: 'Finnhub request failed' },
      { source: 'ALPHA_VANTAGE', status: 'ok', data: alphaVantageProfile },
    ];

    expect(mergeCompanyProfile(candidate, results, now)).toMatchObject({
      ticker: 'AAPL',
      name: 'Apple Inc',
      cik: '0000320193',
      sector: 'TECHNOLOGY',
      description: 'Designs consumer electronics.',
      enrichmentStatus: 'PARTIAL',
      sourcesUsed: ['SEC_EDGAR', 'FINNHUB', 'ALPHA_VANTAGE'],
    });
  });

  it('returns FAILED when all profiles fail', () => {
    const results: AdapterResult<NormalizedCompanyProfile>[] = [
      {
        source: 'SEC_EDGAR',
        status: 'timeout',
        message: 'SEC request timed out',
      },
      { source: 'FINNHUB', status: 'error', message: 'Finnhub request failed' },
      {
        source: 'ALPHA_VANTAGE',
        status: 'disabled',
        message: 'Alpha Vantage adapter is disabled',
      },
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
