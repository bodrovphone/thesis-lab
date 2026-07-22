import {
  CompanyDataAggregatorService,
  mergeSearchCandidates,
  rankMergedCandidates,
} from './company-data-aggregator.service';
import type { CompanySearchCandidate } from './types/company-data.types';
import { ServiceUnavailableException } from '@nestjs/common';

function makeAdapter(source: 'SEC_EDGAR' | 'FINNHUB') {
  return {
    source,
    search: jest.fn(),
    resolveTicker: jest.fn(),
    fetchProfile: jest.fn(),
  };
}

describe('mergeSearchCandidates', () => {
  it('merges duplicate tickers with Finnhub name precedence and SEC CIK', () => {
    const groups = new Map<string, CompanySearchCandidate[]>([
      [
        'AAPL',
        [
          {
            ticker: 'AAPL',
            name: 'Apple Inc.',
            cik: '0000320193',
            exchange: 'Nasdaq',
            sources: ['SEC_EDGAR'],
          },
          {
            ticker: 'AAPL',
            name: 'Apple Inc',
            cik: null,
            exchange: null,
            sources: ['FINNHUB'],
          },
        ],
      ],
    ]);

    expect(mergeSearchCandidates(groups)).toEqual([
      {
        ticker: 'AAPL',
        name: 'Apple Inc',
        cik: '0000320193',
        exchange: 'Nasdaq',
        sources: ['SEC_EDGAR', 'FINNHUB'],
      },
    ]);
  });
});

describe('rankMergedCandidates', () => {
  const candidates: CompanySearchCandidate[] = [
    {
      ticker: 'AAPL',
      name: 'Apple Inc.',
      cik: '0000320193',
      exchange: 'Nasdaq',
      sources: ['SEC_EDGAR'],
    },
    {
      ticker: 'AAPL',
      name: 'Apple Inc.',
      cik: '0000320193',
      exchange: 'Nasdaq',
      sources: ['SEC_EDGAR', 'FINNHUB'],
    },
  ];

  it('prefers dual-source candidates within the same tier', () => {
    const ranked = rankMergedCandidates(candidates, 'AAPL', 1);
    expect(ranked).toHaveLength(1);
    expect(ranked[0].sources).toEqual(['SEC_EDGAR', 'FINNHUB']);
  });
});

describe('CompanyDataAggregatorService', () => {
  it('returns merged search results when both adapters succeed', async () => {
    const sec = makeAdapter('SEC_EDGAR');
    const finnhub = makeAdapter('FINNHUB');
    sec.search.mockResolvedValue({
      source: 'SEC_EDGAR',
      status: 'ok',
      data: [
        {
          ticker: 'AAPL',
          name: 'Apple Inc.',
          cik: '0000320193',
          exchange: 'Nasdaq',
          sources: ['SEC_EDGAR'],
        },
      ],
    });
    finnhub.search.mockResolvedValue({
      source: 'FINNHUB',
      status: 'ok',
      data: [
        {
          ticker: 'AAPL',
          name: 'Apple Inc',
          cik: null,
          exchange: null,
          sources: ['FINNHUB'],
        },
      ],
    });

    const aggregator = new CompanyDataAggregatorService(
      sec as never,
      finnhub as never,
    );

    await expect(aggregator.searchCandidates('apple', 5)).resolves.toEqual([
      {
        ticker: 'AAPL',
        name: 'Apple Inc',
        cik: '0000320193',
        exchange: 'Nasdaq',
        sources: ['SEC_EDGAR', 'FINNHUB'],
      },
    ]);
  });

  it('returns SEC-only results when Finnhub is unavailable', async () => {
    const sec = makeAdapter('SEC_EDGAR');
    const finnhub = makeAdapter('FINNHUB');
    sec.search.mockResolvedValue({
      source: 'SEC_EDGAR',
      status: 'ok',
      data: [
        {
          ticker: 'AAPL',
          name: 'Apple Inc.',
          cik: '0000320193',
          exchange: 'Nasdaq',
          sources: ['SEC_EDGAR'],
        },
      ],
    });
    finnhub.search.mockResolvedValue({
      source: 'FINNHUB',
      status: 'disabled',
      message: 'Finnhub adapter is disabled',
    });

    const aggregator = new CompanyDataAggregatorService(
      sec as never,
      finnhub as never,
    );

    const results = await aggregator.searchCandidates('apple', 5);
    expect(results).toHaveLength(1);
    expect(results[0].sources).toEqual(['SEC_EDGAR']);
  });

  it('throws when both search adapters fail', async () => {
    const sec = makeAdapter('SEC_EDGAR');
    const finnhub = makeAdapter('FINNHUB');
    sec.search.mockResolvedValue({
      source: 'SEC_EDGAR',
      status: 'error',
      message: 'SEC unavailable',
    });
    finnhub.search.mockResolvedValue({
      source: 'FINNHUB',
      status: 'error',
      message: 'Finnhub unavailable',
    });

    const aggregator = new CompanyDataAggregatorService(
      sec as never,
      finnhub as never,
    );

    await expect(
      aggregator.searchCandidates('apple', 5),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('throws when Finnhub is unavailable and SEC misses the ticker', async () => {
    const sec = makeAdapter('SEC_EDGAR');
    const finnhub = makeAdapter('FINNHUB');
    sec.resolveTicker.mockResolvedValue({
      source: 'SEC_EDGAR',
      status: 'ok',
      data: null,
    });
    finnhub.resolveTicker.mockResolvedValue({
      source: 'FINNHUB',
      status: 'disabled',
      message: 'Finnhub adapter is disabled',
    });

    const aggregator = new CompanyDataAggregatorService(
      sec as never,
      finnhub as never,
    );

    await expect(aggregator.resolveCandidate('FOOONLY')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('fetchProfiles returns both adapter results in source order', async () => {
    const sec = makeAdapter('SEC_EDGAR');
    const finnhub = makeAdapter('FINNHUB');
    const candidate: CompanySearchCandidate = {
      ticker: 'AAPL',
      name: 'Apple Inc.',
      cik: '0000320193',
      exchange: 'Nasdaq',
      sources: ['SEC_EDGAR', 'FINNHUB'],
    };
    sec.fetchProfile.mockResolvedValue({
      source: 'SEC_EDGAR',
      status: 'ok',
      data: {
        ticker: 'AAPL',
        name: 'Apple Inc.',
        cik: '0000320193',
        exchange: 'Nasdaq',
        industry: 'Electronic Computers',
        country: null,
        marketCapUsd: null,
        website: null,
        logoUrl: null,
      },
    });
    finnhub.fetchProfile.mockResolvedValue({
      source: 'FINNHUB',
      status: 'timeout',
      message: 'Finnhub request timed out',
    });

    const aggregator = new CompanyDataAggregatorService(
      sec as never,
      finnhub as never,
    );

    const results = await aggregator.fetchProfiles(candidate);
    expect(results.map((result) => result.source)).toEqual([
      'SEC_EDGAR',
      'FINNHUB',
    ]);
  });
});
