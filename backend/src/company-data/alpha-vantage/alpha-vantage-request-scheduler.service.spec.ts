import { AlphaVantageRequestSchedulerService } from './alpha-vantage-request-scheduler.service';
import {
  ALPHA_VANTAGE_DAILY_BUDGET,
  AlphaVantageBudgetService,
} from './alpha-vantage-budget.service';

describe('AlphaVantageRequestSchedulerService', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  function makeScheduler(config: Record<string, string | undefined>) {
    const budget = new AlphaVantageBudgetService();
    const configService = {
      get: jest.fn((key: string) => config[key]),
    };
    return {
      budget,
      scheduler: new AlphaVantageRequestSchedulerService(
        configService as never,
        budget,
      ),
    };
  }

  it('returns disabled when the feature flag is off', async () => {
    const { scheduler } = makeScheduler({
      ENABLE_ALPHA_VANTAGE: 'false',
      ALPHA_VANTAGE_API_KEY: 'secret',
    });

    await expect(scheduler.fetchOverview('AAPL')).resolves.toEqual({
      outcome: 'disabled',
      message: 'Alpha Vantage adapter is disabled',
    });
  });

  it('returns disabled when the API key is missing', async () => {
    const { scheduler } = makeScheduler({
      ENABLE_ALPHA_VANTAGE: 'true',
      ALPHA_VANTAGE_API_KEY: '',
    });

    expect(scheduler.isEnabled()).toBe(false);
    await expect(scheduler.fetchOverview('AAPL')).resolves.toEqual({
      outcome: 'disabled',
      message: 'Alpha Vantage adapter is disabled',
    });
  });

  it('returns rate_limited without calling fetch when the budget is exhausted', async () => {
    const { budget, scheduler } = makeScheduler({
      ENABLE_ALPHA_VANTAGE: 'true',
      ALPHA_VANTAGE_API_KEY: 'secret',
    });
    const now = new Date();
    for (let index = 0; index < ALPHA_VANTAGE_DAILY_BUDGET; index += 1) {
      budget.consume(now);
    }

    global.fetch = jest.fn();

    await expect(scheduler.fetchOverview('AAPL')).resolves.toEqual({
      outcome: 'rate_limited',
      message: 'Alpha Vantage daily budget exhausted',
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('maps upstream note payloads to rate_limited', async () => {
    const { scheduler } = makeScheduler({
      ENABLE_ALPHA_VANTAGE: 'true',
      ALPHA_VANTAGE_API_KEY: 'secret',
    });

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        Note: 'Thank you for using Alpha Vantage! Our standard API call frequency is 25 calls per day.',
      }),
    });

    await expect(scheduler.fetchOverview('AAPL')).resolves.toMatchObject({
      outcome: 'rate_limited',
      message: 'Alpha Vantage request was rate limited',
    });
  });

  it('fetches overview data when enabled and budget remains', async () => {
    const { scheduler } = makeScheduler({
      ENABLE_ALPHA_VANTAGE: 'true',
      ALPHA_VANTAGE_API_KEY: 'secret',
    });

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        Symbol: 'AAPL',
        Name: 'Apple Inc',
        Description: 'Designs consumer electronics.',
        Sector: 'TECHNOLOGY',
        Industry: 'CONSUMER ELECTRONICS',
      }),
    });

    await expect(scheduler.fetchOverview('AAPL')).resolves.toMatchObject({
      outcome: 'ok',
      json: expect.objectContaining({ Symbol: 'AAPL' }),
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.objectContaining({
        href: expect.stringContaining('function=OVERVIEW'),
      }),
      expect.objectContaining({
        headers: { Accept: 'application/json' },
      }),
    );
    expect(String((global.fetch as jest.Mock).mock.calls[0][0])).toContain(
      'symbol=AAPL',
    );
  });
});
