import {
  convertFinnhubMarketCapUsd,
  normalizeFinnhubTicker,
  parseFinnhubProfile2Payload,
  parseFinnhubSearchPayload,
  FinnhubAdapter,
} from './finnhub.adapter';

describe('normalizeFinnhubTicker', () => {
  it('prefers displaySymbol over symbol', () => {
    expect(normalizeFinnhubTicker('aapl', 'AAPL')).toBe('AAPL');
  });
});

describe('parseFinnhubSearchPayload', () => {
  it('maps search rows into candidates', () => {
    expect(
      parseFinnhubSearchPayload({
        count: 1,
        result: [
          {
            description: 'Apple Inc',
            displaySymbol: 'AAPL',
            symbol: 'AAPL',
            type: 'Common Stock',
          },
        ],
      }),
    ).toEqual([
      {
        ticker: 'AAPL',
        name: 'Apple Inc',
        cik: null,
        exchange: null,
        sources: ['FINNHUB'],
      },
    ]);
  });
});

describe('convertFinnhubMarketCapUsd', () => {
  it('converts USD market caps to whole dollars', () => {
    expect(convertFinnhubMarketCapUsd('USD', 3000000)).toBe(3_000_000_000_000n);
  });

  it('returns null for non-USD currencies', () => {
    expect(convertFinnhubMarketCapUsd('EUR', 3000)).toBeNull();
  });

  it('returns null for negative values', () => {
    expect(convertFinnhubMarketCapUsd('USD', -1)).toBeNull();
  });
});

describe('parseFinnhubProfile2Payload', () => {
  it('parses profile2 payloads', () => {
    expect(
      parseFinnhubProfile2Payload(
        {
          name: 'Apple Inc',
          ticker: 'AAPL',
          exchange: 'NASDAQ',
          finnhubIndustry: 'Technology',
          country: 'US',
          currency: 'USD',
          marketCapitalization: 3000000,
          weburl: 'https://apple.com',
          logo: 'https://static2.finnhub.io/file/publicdatany/finnhubimage/stock_logo/AAPL.png',
        },
        'AAPL',
      ),
    ).toMatchObject({
      ticker: 'AAPL',
      name: 'Apple Inc',
      sector: null,
      industry: 'Technology',
      description: null,
      country: 'US',
      marketCapUsd: 3_000_000_000_000n,
      website: 'https://apple.com',
    });
  });
});

describe('FinnhubAdapter', () => {
  function makeAdapter(enabled = true) {
    const scheduler = {
      isEnabled: jest.fn().mockReturnValue(enabled),
      fetchJson: jest.fn(),
    };
    const searchCache = {
      getOrFetch: jest.fn((_query, _limit, fetcher: () => Promise<unknown>) =>
        fetcher(),
      ),
    };
    const adapter = new FinnhubAdapter(
      scheduler as never,
      searchCache as never,
    );
    return { adapter, scheduler, searchCache };
  }

  it('returns disabled without fetching when the key is missing', async () => {
    const { adapter, scheduler } = makeAdapter(false);

    await expect(adapter.search('apple', 5)).resolves.toEqual({
      source: 'FINNHUB',
      status: 'disabled',
      message: 'Finnhub adapter is disabled',
    });
    expect(scheduler.fetchJson).not.toHaveBeenCalled();
  });

  it('builds the search URL with encoded query and exchange=US', async () => {
    const { adapter, scheduler } = makeAdapter();
    scheduler.fetchJson.mockResolvedValue({
      outcome: 'ok',
      json: { count: 0, result: [] },
    });

    await adapter.search('apple inc', 5);

    expect(scheduler.fetchJson).toHaveBeenCalledWith(
      '/search?q=apple%20inc&exchange=US',
      'symbol_search',
      'search',
    );
  });
});
