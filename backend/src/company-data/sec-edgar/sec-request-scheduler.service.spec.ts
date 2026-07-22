import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SecRequestSchedulerService } from './sec-request-scheduler.service';

function makeConfig(userAgent = 'Thesis Lab test@example.com'): ConfigService {
  return {
    getOrThrow: jest.fn().mockReturnValue(userAgent),
  } as unknown as ConfigService;
}

describe('SecRequestSchedulerService', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('sends the required SEC fair-access headers', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ hello: 'world' }),
    });
    global.fetch = fetchMock;

    const scheduler = new SecRequestSchedulerService(
      makeConfig('Thesis Lab test@example.com'),
    );
    const result = await scheduler.fetchJson(
      'https://example.com/data.json',
      'test_op',
    );

    expect(result).toEqual({
      outcome: 'ok',
      httpStatus: 200,
      json: { hello: 'world' },
      message: 'ok',
    });

    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://example.com/data.json');
    const headers = options.headers as Record<string, string>;
    expect(headers['User-Agent']).toBe('Thesis Lab test@example.com');
    expect(headers['Accept']).toBe('application/json');
    expect(headers['Accept-Encoding']).toBe('gzip, deflate');
    expect(options.signal).toBeInstanceOf(AbortSignal);
  });

  it('normalizes 403 and 429 responses to rate_limited', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 429 })
      .mockResolvedValueOnce({ ok: false, status: 403 });
    global.fetch = fetchMock;

    const scheduler = new SecRequestSchedulerService(makeConfig());

    const first = await scheduler.fetchJson('https://example.com/1', 'op');
    expect(first.outcome).toBe('rate_limited');
    expect(first.httpStatus).toBe(429);

    const second = await scheduler.fetchJson('https://example.com/2', 'op');
    expect(second.outcome).toBe('rate_limited');
    expect(second.httpStatus).toBe(403);
  });

  it('normalizes other non-ok responses to error', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: false, status: 500 });
    global.fetch = fetchMock;

    const scheduler = new SecRequestSchedulerService(makeConfig());
    const result = await scheduler.fetchJson('https://example.com', 'op');

    expect(result.outcome).toBe('error');
    expect(result.httpStatus).toBe(500);
  });

  it('normalizes an aborted fetch to timeout', async () => {
    const fetchMock = jest
      .fn()
      .mockRejectedValue(
        new DOMException('The operation timed out', 'TimeoutError'),
      );
    global.fetch = fetchMock;

    const scheduler = new SecRequestSchedulerService(makeConfig());
    const result = await scheduler.fetchJson('https://example.com', 'op');

    expect(result).toEqual({
      outcome: 'timeout',
      message: 'SEC request timed out',
    });
  });

  it('never logs the full User-Agent or response payload', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ secret: 'do-not-log-me' }),
    });
    global.fetch = fetchMock;

    const logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    const scheduler = new SecRequestSchedulerService(
      makeConfig('Thesis Lab contact@example.com'),
    );
    await scheduler.fetchJson('https://example.com', 'op');

    const loggedText = logSpy.mock.calls
      .map((call) => String(call[0]))
      .join('\n');
    expect(loggedText).not.toContain('contact@example.com');
    expect(loggedText).not.toContain('do-not-log-me');

    logSpy.mockRestore();
  });

  it('spaces consecutive request starts by at least the minimum interval', async () => {
    const startTimes: number[] = [];
    const fetchMock = jest.fn().mockImplementation(() => {
      startTimes.push(Date.now());
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({}),
      });
    });
    global.fetch = fetchMock;

    const scheduler = new SecRequestSchedulerService(makeConfig());
    await Promise.all([
      scheduler.fetchJson('https://example.com/1', 'op'),
      scheduler.fetchJson('https://example.com/2', 'op'),
      scheduler.fetchJson('https://example.com/3', 'op'),
    ]);

    expect(startTimes).toHaveLength(3);
    expect(startTimes[1] - startTimes[0]).toBeGreaterThanOrEqual(120);
    expect(startTimes[2] - startTimes[1]).toBeGreaterThanOrEqual(120);
  }, 10000);
});
