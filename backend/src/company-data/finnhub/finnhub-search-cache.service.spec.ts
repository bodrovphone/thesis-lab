import { FinnhubSearchCacheService } from './finnhub-search-cache.service';

describe('FinnhubSearchCacheService', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-07-23T00:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('caches successful empty search results', async () => {
    const cache = new FinnhubSearchCacheService();
    const fetcher = jest.fn().mockResolvedValue({
      source: 'FINNHUB',
      status: 'ok',
      data: [],
    });

    await cache.getOrFetch('apple', 5, fetcher);
    await cache.getOrFetch('apple', 5, fetcher);

    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('does not cache error results', async () => {
    const cache = new FinnhubSearchCacheService();
    const fetcher = jest
      .fn()
      .mockResolvedValueOnce({
        source: 'FINNHUB',
        status: 'error',
        message: 'Finnhub request failed',
      })
      .mockResolvedValueOnce({
        source: 'FINNHUB',
        status: 'ok',
        data: [],
      });

    await cache.getOrFetch('apple', 5, fetcher);
    await cache.getOrFetch('apple', 5, fetcher);

    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('coalesces identical concurrent searches', async () => {
    const cache = new FinnhubSearchCacheService();
    let resolveFetch: ((value: unknown) => void) | undefined;
    const fetcher = jest.fn(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
        }),
    );

    const first = cache.getOrFetch('apple', 5, fetcher);
    const second = cache.getOrFetch('apple', 5, fetcher);

    resolveFetch?.({
      source: 'FINNHUB',
      status: 'ok',
      data: [],
    });

    await Promise.all([first, second]);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
