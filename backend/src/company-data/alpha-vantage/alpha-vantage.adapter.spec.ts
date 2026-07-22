import {
  AlphaVantageAdapter,
  normalizeAlphaVantageString,
  parseAlphaVantageMarketCapUsd,
  parseAlphaVantageOverviewPayload,
} from './alpha-vantage.adapter';

describe('normalizeAlphaVantageString', () => {
  it('returns null for placeholders and empty values', () => {
    expect(normalizeAlphaVantageString('None')).toBeNull();
    expect(normalizeAlphaVantageString('-')).toBeNull();
    expect(normalizeAlphaVantageString('')).toBeNull();
  });
});

describe('parseAlphaVantageMarketCapUsd', () => {
  it('parses whole-dollar market caps', () => {
    expect(parseAlphaVantageMarketCapUsd('3000000000000')).toBe(
      3_000_000_000_000n,
    );
  });

  it('returns null for zero or invalid values', () => {
    expect(parseAlphaVantageMarketCapUsd('0')).toBeNull();
    expect(parseAlphaVantageMarketCapUsd('not-a-number')).toBeNull();
  });
});

describe('parseAlphaVantageOverviewPayload', () => {
  it('maps overview fields into a normalized profile', () => {
    expect(
      parseAlphaVantageOverviewPayload(
        {
          Symbol: 'AAPL',
          Name: 'Apple Inc',
          Description: 'Designs consumer electronics.',
          Exchange: 'NASDAQ',
          Country: 'USA',
          Sector: 'TECHNOLOGY',
          Industry: 'CONSUMER ELECTRONICS',
          MarketCapitalization: '3000000000000',
        },
        'AAPL',
      ),
    ).toMatchObject({
      ticker: 'AAPL',
      name: 'Apple Inc',
      description: 'Designs consumer electronics.',
      sector: 'TECHNOLOGY',
      industry: 'CONSUMER ELECTRONICS',
      country: 'USA',
      exchange: 'NASDAQ',
      marketCapUsd: 3_000_000_000_000n,
    });
  });

  it('returns null when the payload has no usable identity fields', () => {
    expect(parseAlphaVantageOverviewPayload({}, 'AAPL')).toBeNull();
  });
});

describe('AlphaVantageAdapter', () => {
  function makeAdapter(enabled = true) {
    const scheduler = {
      isEnabled: jest.fn().mockReturnValue(enabled),
      fetchOverview: jest.fn(),
    };
    return {
      adapter: new AlphaVantageAdapter(scheduler as never),
      scheduler,
    };
  }

  it('does not participate in search', async () => {
    const { adapter, scheduler } = makeAdapter();

    await expect(adapter.search('apple', 5)).resolves.toEqual({
      source: 'ALPHA_VANTAGE',
      status: 'disabled',
      message: 'Alpha Vantage does not support search',
    });
    expect(scheduler.fetchOverview).not.toHaveBeenCalled();
  });

  it('returns disabled without fetching when the adapter is off', async () => {
    const { adapter, scheduler } = makeAdapter(false);

    await expect(
      adapter.fetchProfile({
        ticker: 'AAPL',
        name: 'Apple Inc.',
        cik: '0000320193',
        exchange: 'Nasdaq',
        sources: ['SEC_EDGAR', 'FINNHUB'],
      }),
    ).resolves.toEqual({
      source: 'ALPHA_VANTAGE',
      status: 'disabled',
      message: 'Alpha Vantage adapter is disabled',
    });
    expect(scheduler.fetchOverview).not.toHaveBeenCalled();
  });

  it('maps budget exhaustion to rate_limited', async () => {
    const { adapter, scheduler } = makeAdapter();
    scheduler.fetchOverview.mockResolvedValue({
      outcome: 'rate_limited',
      message: 'Alpha Vantage daily budget exhausted',
    });

    await expect(
      adapter.fetchProfile({
        ticker: 'AAPL',
        name: 'Apple Inc.',
        cik: '0000320193',
        exchange: 'Nasdaq',
        sources: ['SEC_EDGAR', 'FINNHUB'],
      }),
    ).resolves.toEqual({
      source: 'ALPHA_VANTAGE',
      status: 'rate_limited',
      message: 'Alpha Vantage daily budget exhausted',
    });
  });

  it('maps malformed overview payloads to error', async () => {
    const { adapter, scheduler } = makeAdapter();
    scheduler.fetchOverview.mockResolvedValue({
      outcome: 'ok',
      json: { Symbol: 'MSFT', Name: 'Microsoft Corporation' },
    });

    await expect(
      adapter.fetchProfile({
        ticker: 'AAPL',
        name: 'Apple Inc.',
        cik: '0000320193',
        exchange: 'Nasdaq',
        sources: ['SEC_EDGAR', 'FINNHUB'],
      }),
    ).resolves.toEqual({
      source: 'ALPHA_VANTAGE',
      status: 'error',
      message: 'Alpha Vantage overview payload was invalid',
    });
  });
});
