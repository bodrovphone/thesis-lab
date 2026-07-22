import {
  SecEdgarAdapter,
  normalizeTickerRecords,
  rankCandidates,
  validateSubmissionsPayload,
  validateTickerExchangePayload,
  type SecTickerExchangePayload,
  type SecTickerRecord,
} from './sec-edgar.adapter';

describe('validateTickerExchangePayload', () => {
  const validPayload = {
    fields: ['cik', 'name', 'ticker', 'exchange'],
    data: [[320193, 'Apple Inc.', 'AAPL', 'Nasdaq']],
  };

  it('accepts a well-formed payload', () => {
    expect(validateTickerExchangePayload(validPayload)).toEqual(validPayload);
  });

  it('rejects a payload missing a required field', () => {
    const malformed = {
      fields: ['cik', 'name', 'ticker'],
      data: [[320193, 'Apple Inc.', 'AAPL']],
    };
    expect(() => validateTickerExchangePayload(malformed)).toThrow(
      /missing required field/,
    );
  });

  it('rejects a payload whose data is not an array', () => {
    const malformed = {
      fields: ['cik', 'name', 'ticker', 'exchange'],
      data: 'nope',
    };
    expect(() => validateTickerExchangePayload(malformed)).toThrow(
      /invalid data array/,
    );
  });

  it('rejects a payload with a row length mismatch', () => {
    const malformed = {
      fields: ['cik', 'name', 'ticker', 'exchange'],
      data: [[320193, 'Apple Inc.', 'AAPL']],
    };
    expect(() => validateTickerExchangePayload(malformed)).toThrow(
      /malformed row/,
    );
  });

  it('rejects a non-object payload', () => {
    expect(() => validateTickerExchangePayload(null)).toThrow(/not an object/);
    expect(() => validateTickerExchangePayload('nope')).toThrow(
      /not an object/,
    );
  });
});

describe('normalizeTickerRecords', () => {
  it('parses positions by the fields array rather than assuming column order', () => {
    const payload: SecTickerExchangePayload = {
      fields: ['ticker', 'cik', 'exchange', 'name'],
      data: [['aapl', 320193, 'Nasdaq', 'Apple Inc.']],
    };

    expect(normalizeTickerRecords(payload)).toEqual([
      {
        cik: '0000320193',
        name: 'Apple Inc.',
        ticker: 'AAPL',
        exchange: 'Nasdaq',
      },
    ]);
  });

  it('zero-pads the CIK to ten characters', () => {
    const payload: SecTickerExchangePayload = {
      fields: ['cik', 'name', 'ticker', 'exchange'],
      data: [[1, 'Tiny Corp', 'TINY', null]],
    };

    expect(normalizeTickerRecords(payload)[0].cik).toBe('0000000001');
  });

  it('uppercases the ticker', () => {
    const payload: SecTickerExchangePayload = {
      fields: ['cik', 'name', 'ticker', 'exchange'],
      data: [[320193, 'Apple Inc.', 'aapl', 'Nasdaq']],
    };

    expect(normalizeTickerRecords(payload)[0].ticker).toBe('AAPL');
  });

  it('preserves a null exchange', () => {
    const payload: SecTickerExchangePayload = {
      fields: ['cik', 'name', 'ticker', 'exchange'],
      data: [[320193, 'Apple Inc.', 'AAPL', null]],
    };

    expect(normalizeTickerRecords(payload)[0].exchange).toBeNull();
  });

  it('skips a row with the wrong value types instead of throwing', () => {
    const payload: SecTickerExchangePayload = {
      fields: ['cik', 'name', 'ticker', 'exchange'],
      data: [
        [320193, 'Apple Inc.', 'AAPL', 'Nasdaq'],
        [null, 'Bad Row', 'BAD', 'Nasdaq'],
      ],
    };

    expect(normalizeTickerRecords(payload)).toHaveLength(1);
  });
});

describe('rankCandidates', () => {
  const records: SecTickerRecord[] = [
    {
      ticker: 'AAPL',
      name: 'Apple Inc.',
      cik: '0000320193',
      exchange: 'Nasdaq',
    },
    {
      ticker: 'AAP',
      name: 'Advance Auto Parts Inc.',
      cik: '0001033012',
      exchange: 'NYSE',
    },
    {
      ticker: 'MSFT',
      name: 'Microsoft Corporation',
      cik: '0000789019',
      exchange: 'Nasdaq',
    },
    {
      ticker: 'GOOGL',
      name: 'Alphabet Inc.',
      cik: '0001652044',
      exchange: 'Nasdaq',
    },
  ];

  it('ranks an exact ticker match first', () => {
    const result = rankCandidates(records, 'AAPL', 10);
    expect(result.map((r) => r.ticker)).toEqual(['AAPL']);
  });

  it('ranks ticker-prefix matches before name matches, tie-broken by ticker ascending', () => {
    const result = rankCandidates(records, 'AA', 10);
    expect(result.map((r) => r.ticker)).toEqual(['AAP', 'AAPL']);
  });

  it('ranks a company-name prefix match', () => {
    const result = rankCandidates(records, 'alphabet', 10);
    expect(result.map((r) => r.ticker)).toEqual(['GOOGL']);
  });

  it('ranks company-name substring matches and applies the limit', () => {
    const result = rankCandidates(records, 'inc', 2);
    expect(result.map((r) => r.ticker)).toEqual(['AAP', 'AAPL']);
  });

  it('is case-insensitive and trims the query', () => {
    const result = rankCandidates(records, '  aapl  ', 10);
    expect(result.map((r) => r.ticker)).toEqual(['AAPL']);
  });

  it('returns no results when nothing matches', () => {
    expect(rankCandidates(records, 'zzzzz', 10)).toEqual([]);
  });
});

describe('validateSubmissionsPayload', () => {
  it('accepts a payload with the documented fields', () => {
    const raw = {
      cik: '0000320193',
      name: 'Apple Inc.',
      tickers: ['AAPL'],
      exchanges: ['Nasdaq'],
      sic: '3571',
      sicDescription: 'Electronic Computers',
    };
    expect(validateSubmissionsPayload(raw)).toEqual(raw);
  });

  it('rejects a payload missing cik or name', () => {
    expect(() => validateSubmissionsPayload({ name: 'Apple Inc.' })).toThrow();
    expect(() => validateSubmissionsPayload({ cik: '0000320193' })).toThrow();
  });
});

describe('SecEdgarAdapter', () => {
  const samplePayload: SecTickerExchangePayload = {
    fields: ['cik', 'name', 'ticker', 'exchange'],
    data: [[320193, 'Apple Inc.', 'AAPL', 'Nasdaq']],
  };

  function makeAdapter() {
    const cache = { getOrRefresh: jest.fn().mockResolvedValue(samplePayload) };
    const scheduler = { fetchJson: jest.fn() };
    const adapter = new SecEdgarAdapter(cache as never, scheduler as never);
    return { adapter, cache, scheduler };
  }

  it('search() reads through the persistent cache and ranks candidates', async () => {
    const { adapter, cache } = makeAdapter();

    const results = await adapter.search('AAPL', 10);

    expect(results).toEqual([
      {
        ticker: 'AAPL',
        name: 'Apple Inc.',
        cik: '0000320193',
        exchange: 'Nasdaq',
        source: 'SEC_EDGAR',
      },
    ]);
    expect(cache.getOrRefresh).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'SEC_EDGAR',
        cacheKey: 'company_tickers_exchange:v1',
        ttlMs: 24 * 60 * 60 * 1000,
      }),
    );
  });

  it('resolveTicker() finds an exact match only', async () => {
    const { adapter } = makeAdapter();

    await expect(adapter.resolveTicker('aapl')).resolves.toEqual(
      expect.objectContaining({ ticker: 'AAPL' }),
    );
    await expect(adapter.resolveTicker('AA')).resolves.toBeNull();
  });

  it('fetchProfile() maps a successful submissions response to a NormalizedCompanyProfile', async () => {
    const { adapter, scheduler } = makeAdapter();
    scheduler.fetchJson.mockResolvedValue({
      outcome: 'ok',
      json: {
        cik: '0000320193',
        name: 'Apple Inc.',
        sicDescription: 'Electronic Computers',
      },
    });

    const candidate = {
      ticker: 'AAPL',
      name: 'Apple Inc.',
      cik: '0000320193',
      exchange: 'Nasdaq',
      source: 'SEC_EDGAR' as const,
    };

    const result = await adapter.fetchProfile(candidate);

    expect(result).toEqual({
      source: 'SEC_EDGAR',
      status: 'ok',
      data: {
        ticker: 'AAPL',
        name: 'Apple Inc.',
        cik: '0000320193',
        exchange: 'Nasdaq',
        industry: 'Electronic Computers',
      },
    });
    expect(scheduler.fetchJson).toHaveBeenCalledWith(
      'https://data.sec.gov/submissions/CIK0000320193.json',
      'submissions_profile',
    );
  });

  it('fetchProfile() propagates a timeout outcome from the scheduler', async () => {
    const { adapter, scheduler } = makeAdapter();
    scheduler.fetchJson.mockResolvedValue({
      outcome: 'timeout',
      message: 'SEC request timed out',
    });

    const candidate = {
      ticker: 'AAPL',
      name: 'Apple Inc.',
      cik: '0000320193',
      exchange: 'Nasdaq',
      source: 'SEC_EDGAR' as const,
    };

    await expect(adapter.fetchProfile(candidate)).resolves.toEqual({
      source: 'SEC_EDGAR',
      status: 'timeout',
      message: 'SEC request timed out',
    });
  });

  it('fetchProfile() treats an invalid submissions payload as an error', async () => {
    const { adapter, scheduler } = makeAdapter();
    scheduler.fetchJson.mockResolvedValue({
      outcome: 'ok',
      json: { oops: true },
    });

    const candidate = {
      ticker: 'AAPL',
      name: 'Apple Inc.',
      cik: '0000320193',
      exchange: 'Nasdaq',
      source: 'SEC_EDGAR' as const,
    };

    const result = await adapter.fetchProfile(candidate);
    expect(result.status).toBe('error');
  });

  it('the ticker directory refresh callback throws when the scheduler reports a non-ok outcome', async () => {
    const cache = { getOrRefresh: jest.fn() };
    const scheduler = {
      fetchJson: jest
        .fn()
        .mockResolvedValue({ outcome: 'error', message: 'SEC request failed' }),
    };
    const adapter = new SecEdgarAdapter(cache as never, scheduler as never);
    cache.getOrRefresh.mockImplementation(
      async (params: { refresh: () => Promise<unknown> }) => params.refresh(),
    );

    await expect(adapter.search('AAPL', 10)).rejects.toThrow(
      'SEC request failed',
    );
  });
});
