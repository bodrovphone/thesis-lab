import { ConfigService } from '@nestjs/config';
import { FinnhubRequestSchedulerService } from './finnhub-request-scheduler.service';

describe('FinnhubRequestSchedulerService', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.useRealTimers();
  });

  function makeScheduler(apiKey = 'test-key') {
    const config = {
      get: jest.fn((key: string) =>
        key === 'FINNHUB_API_KEY' ? apiKey : undefined,
      ),
    };
    return new FinnhubRequestSchedulerService(
      config as unknown as ConfigService,
    );
  }

  it('reports disabled when the API key is missing', () => {
    const scheduler = makeScheduler('   ');
    expect(scheduler.isEnabled()).toBe(false);
  });

  it('sends the token only through X-Finnhub-Token', async () => {
    const scheduler = makeScheduler('secret-token');
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ result: [] }),
    });

    await scheduler.fetchJson(
      '/search?q=apple&exchange=US',
      'symbol_search',
      'search',
    );

    expect(global.fetch).toHaveBeenCalledWith(
      'https://finnhub.io/api/v1/search?q=apple&exchange=US',
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-Finnhub-Token': 'secret-token',
        }),
      }),
    );
  });

  it('returns rate_limited immediately when the search budget is exhausted', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-07-23T00:00:00.000Z'));

    const scheduler = makeScheduler();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ result: [] }),
    });

    for (let index = 0; index < 50; index += 1) {
      await scheduler.fetchJson(
        '/search?q=apple&exchange=US',
        'symbol_search',
        'search',
      );
      jest.advanceTimersByTime(40);
    }

    const result = await scheduler.fetchJson(
      '/search?q=apple&exchange=US',
      'symbol_search',
      'search',
    );

    expect(result.outcome).toBe('rate_limited');
    expect(global.fetch).toHaveBeenCalledTimes(50);
  });
});
