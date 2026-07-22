import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1';
const MIN_START_INTERVAL_MS = 40;
const REQUEST_TIMEOUT_MS = 5000;
const ROLLING_WINDOW_MS = 60_000;
const SEARCH_BUDGET = 50;
const PROFILE_BUDGET = 55;

export type FinnhubRequestKind = 'search' | 'profile';

export type FinnhubFetchOutcome = 'ok' | 'error' | 'timeout' | 'rate_limited';

export interface FinnhubFetchResult {
  outcome: FinnhubFetchOutcome;
  httpStatus?: number;
  json?: unknown;
  message: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

@Injectable()
export class FinnhubRequestSchedulerService {
  private readonly logger = new Logger(FinnhubRequestSchedulerService.name);
  private readonly apiKey: string | null;
  private chain: Promise<void> = Promise.resolve();
  private lastStartedAt = 0;
  private readonly requestTimestamps: number[] = [];

  constructor(private readonly config: ConfigService) {
    const rawKey = this.config.get<string>('FINNHUB_API_KEY');
    const trimmed = rawKey?.trim();
    this.apiKey = trimmed ? trimmed : null;
    if (!this.apiKey) {
      this.logger.warn(
        'FINNHUB_API_KEY is missing or empty; Finnhub adapter is disabled',
      );
    }
  }

  isEnabled(): boolean {
    return this.apiKey !== null;
  }

  fetchJson(
    path: string,
    operation: string,
    kind: FinnhubRequestKind,
  ): Promise<FinnhubFetchResult> {
    if (!this.apiKey) {
      return Promise.resolve({
        outcome: 'error',
        message: 'Finnhub adapter is disabled',
      });
    }

    const run = this.chain.then(() =>
      this.runRequest(path, operation, kind, this.apiKey as string),
    );
    this.chain = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  private pruneTimestamps(now: number): void {
    const cutoff = now - ROLLING_WINDOW_MS;
    while (
      this.requestTimestamps.length > 0 &&
      this.requestTimestamps[0] < cutoff
    ) {
      this.requestTimestamps.shift();
    }
  }

  private canAcquire(kind: FinnhubRequestKind, now: number): boolean {
    this.pruneTimestamps(now);
    const budget = kind === 'search' ? SEARCH_BUDGET : PROFILE_BUDGET;
    return this.requestTimestamps.length < budget;
  }

  private recordAcquisition(now: number): void {
    this.pruneTimestamps(now);
    this.requestTimestamps.push(now);
  }

  private async runRequest(
    path: string,
    operation: string,
    kind: FinnhubRequestKind,
    apiKey: string,
  ): Promise<FinnhubFetchResult> {
    const wait = MIN_START_INTERVAL_MS - (Date.now() - this.lastStartedAt);
    if (wait > 0) {
      await sleep(wait);
    }
    this.lastStartedAt = Date.now();
    const startedAt = this.lastStartedAt;

    if (!this.canAcquire(kind, startedAt)) {
      this.logger.warn(
        `source=FINNHUB operation=${operation} outcome=rate_limited reason=budget_exhausted`,
      );
      return {
        outcome: 'rate_limited',
        message: 'Finnhub request budget exhausted',
      };
    }

    this.recordAcquisition(startedAt);

    const url = `${FINNHUB_BASE_URL}${path}`;

    try {
      const response = await fetch(url, {
        headers: {
          'X-Finnhub-Token': apiKey,
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      const durationMs = Date.now() - startedAt;

      if (response.status === 401 || response.status === 403) {
        this.logger.warn(
          `source=FINNHUB operation=${operation} outcome=authentication_failed status=${response.status} durationMs=${durationMs}`,
        );
        return {
          outcome: 'error',
          httpStatus: response.status,
          message: 'Finnhub authentication failed',
        };
      }

      if (response.status === 429) {
        this.logger.warn(
          `source=FINNHUB operation=${operation} outcome=rate_limited status=${response.status} durationMs=${durationMs}`,
        );
        return {
          outcome: 'rate_limited',
          httpStatus: response.status,
          message: 'Finnhub request was rate limited',
        };
      }

      if (!response.ok) {
        this.logger.warn(
          `source=FINNHUB operation=${operation} outcome=error status=${response.status} durationMs=${durationMs}`,
        );
        return {
          outcome: 'error',
          httpStatus: response.status,
          message: 'Finnhub request failed',
        };
      }

      let json: unknown;
      try {
        json = await response.json();
      } catch {
        this.logger.warn(
          `source=FINNHUB operation=${operation} outcome=error reason=invalid_json durationMs=${Date.now() - startedAt}`,
        );
        return {
          outcome: 'error',
          message: 'Finnhub response was not valid JSON',
        };
      }

      this.logger.log(
        `source=FINNHUB operation=${operation} outcome=ok status=${response.status} durationMs=${durationMs}`,
      );
      return {
        outcome: 'ok',
        httpStatus: response.status,
        json,
        message: 'ok',
      };
    } catch (error) {
      const durationMs = Date.now() - startedAt;
      const errorName =
        typeof error === 'object' && error !== null && 'name' in error
          ? error.name
          : undefined;
      const isTimeout =
        errorName === 'TimeoutError' || errorName === 'AbortError';

      if (isTimeout) {
        this.logger.warn(
          `source=FINNHUB operation=${operation} outcome=timeout durationMs=${durationMs}`,
        );
        return { outcome: 'timeout', message: 'Finnhub request timed out' };
      }

      this.logger.warn(
        `source=FINNHUB operation=${operation} outcome=error durationMs=${durationMs}`,
      );
      return { outcome: 'error', message: 'Finnhub request failed' };
    }
  }
}
