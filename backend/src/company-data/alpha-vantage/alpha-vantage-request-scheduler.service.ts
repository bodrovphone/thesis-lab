import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AlphaVantageBudgetService,
  ALPHA_VANTAGE_DAILY_BUDGET,
} from './alpha-vantage-budget.service';

const ALPHA_VANTAGE_BASE_URL = 'https://www.alphavantage.co/query';
const REQUEST_TIMEOUT_MS = 5000;

export type AlphaVantageFetchOutcome =
  | 'ok'
  | 'error'
  | 'timeout'
  | 'rate_limited'
  | 'disabled';

export interface AlphaVantageFetchResult {
  outcome: AlphaVantageFetchOutcome;
  httpStatus?: number;
  json?: unknown;
  message: string;
}

function isTruthyEnv(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === 'true';
}

function isRateLimitPayload(json: unknown): boolean {
  if (typeof json !== 'object' || json === null) {
    return false;
  }

  const payload = json as Record<string, unknown>;
  return (
    typeof payload.Note === 'string' ||
    typeof payload.Information === 'string'
  );
}

@Injectable()
export class AlphaVantageRequestSchedulerService {
  private readonly logger = new Logger(
    AlphaVantageRequestSchedulerService.name,
  );
  private readonly apiKey: string | null;
  private readonly enabled: boolean;

  constructor(
    private readonly config: ConfigService,
    private readonly budget: AlphaVantageBudgetService,
  ) {
    const rawKey = this.config.get<string>('ALPHA_VANTAGE_API_KEY');
    const trimmed = rawKey?.trim();
    this.apiKey = trimmed ? trimmed : null;
    this.enabled = isTruthyEnv(this.config.get<string>('ENABLE_ALPHA_VANTAGE'));

    if (!this.enabled) {
      this.logger.log(
        'ENABLE_ALPHA_VANTAGE is false; Alpha Vantage adapter is disabled',
      );
    } else if (!this.apiKey) {
      this.logger.warn(
        'ALPHA_VANTAGE_API_KEY is missing or empty; Alpha Vantage adapter is disabled',
      );
    }
  }

  isEnabled(): boolean {
    return this.enabled && this.apiKey !== null;
  }

  async fetchOverview(symbol: string): Promise<AlphaVantageFetchResult> {
    if (!this.enabled) {
      return {
        outcome: 'disabled',
        message: 'Alpha Vantage adapter is disabled',
      };
    }

    if (!this.apiKey) {
      return {
        outcome: 'disabled',
        message: 'Alpha Vantage adapter is disabled',
      };
    }

    const now = new Date();
    const snapshot = this.budget.getSnapshot(now);
    if (!this.budget.hasBudget(now)) {
      this.logger.warn(
        `source=ALPHA_VANTAGE operation=overview outcome=rate_limited reason=budget_exhausted used=${snapshot.used} cap=${ALPHA_VANTAGE_DAILY_BUDGET}`,
      );
      return {
        outcome: 'rate_limited',
        message: 'Alpha Vantage daily budget exhausted',
      };
    }

    if (!this.budget.consume(now)) {
      this.logger.warn(
        `source=ALPHA_VANTAGE operation=overview outcome=rate_limited reason=budget_exhausted used=${snapshot.used} cap=${ALPHA_VANTAGE_DAILY_BUDGET}`,
      );
      return {
        outcome: 'rate_limited',
        message: 'Alpha Vantage daily budget exhausted',
      };
    }

    const url = new URL(ALPHA_VANTAGE_BASE_URL);
    url.searchParams.set('function', 'OVERVIEW');
    url.searchParams.set('symbol', symbol);
    url.searchParams.set('apikey', this.apiKey);
    const startedAt = Date.now();

    try {
      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      const durationMs = Date.now() - startedAt;

      if (response.status === 429) {
        this.logger.warn(
          `source=ALPHA_VANTAGE operation=overview outcome=rate_limited status=${response.status} durationMs=${durationMs}`,
        );
        return {
          outcome: 'rate_limited',
          httpStatus: response.status,
          message: 'Alpha Vantage request was rate limited',
        };
      }

      if (!response.ok) {
        this.logger.warn(
          `source=ALPHA_VANTAGE operation=overview outcome=error status=${response.status} durationMs=${durationMs}`,
        );
        return {
          outcome: 'error',
          httpStatus: response.status,
          message: 'Alpha Vantage request failed',
        };
      }

      let json: unknown;
      try {
        json = await response.json();
      } catch {
        this.logger.warn(
          `source=ALPHA_VANTAGE operation=overview outcome=error reason=invalid_json durationMs=${Date.now() - startedAt}`,
        );
        return {
          outcome: 'error',
          message: 'Alpha Vantage response was not valid JSON',
        };
      }

      if (isRateLimitPayload(json)) {
        this.logger.warn(
          `source=ALPHA_VANTAGE operation=overview outcome=rate_limited reason=upstream_note durationMs=${durationMs}`,
        );
        return {
          outcome: 'rate_limited',
          httpStatus: response.status,
          json,
          message: 'Alpha Vantage request was rate limited',
        };
      }

      this.logger.log(
        `source=ALPHA_VANTAGE operation=overview outcome=ok status=${response.status} durationMs=${durationMs} remainingBudget=${this.budget.getSnapshot(new Date()).remaining}`,
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
          `source=ALPHA_VANTAGE operation=overview outcome=timeout durationMs=${durationMs}`,
        );
        return { outcome: 'timeout', message: 'Alpha Vantage request timed out' };
      }

      this.logger.warn(
        `source=ALPHA_VANTAGE operation=overview outcome=error durationMs=${durationMs}`,
      );
      return { outcome: 'error', message: 'Alpha Vantage request failed' };
    }
  }
}
