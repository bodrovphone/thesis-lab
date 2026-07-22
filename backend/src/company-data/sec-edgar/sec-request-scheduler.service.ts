import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const MIN_START_INTERVAL_MS = 125;
const REQUEST_TIMEOUT_MS = 5000;

export type SecFetchOutcome = 'ok' | 'error' | 'timeout' | 'rate_limited';

export interface SecFetchResult {
  outcome: SecFetchOutcome;
  httpStatus?: number;
  json?: unknown;
  message: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Enforces SEC's fair-access contract for every outbound request: a shared
 * User-Agent, required headers, a 5s timeout, and a 125ms minimum spacing
 * between request starts (well under the 10 req/s ceiling). All SEC HTTP
 * calls in this module must go through this scheduler.
 */
@Injectable()
export class SecRequestSchedulerService {
  private readonly logger = new Logger(SecRequestSchedulerService.name);
  private readonly userAgent: string;
  private chain: Promise<void> = Promise.resolve();
  private lastStartedAt = 0;

  constructor(private readonly config: ConfigService) {
    this.userAgent = this.config.getOrThrow<string>('SEC_EDGAR_USER_AGENT');
  }

  fetchJson(url: string, operation: string): Promise<SecFetchResult> {
    const run = this.chain.then(() => this.runRequest(url, operation));
    // Keep the chain alive regardless of individual request outcomes so one
    // failure never stalls requests queued behind it.
    this.chain = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  private async runRequest(
    url: string,
    operation: string,
  ): Promise<SecFetchResult> {
    const wait = MIN_START_INTERVAL_MS - (Date.now() - this.lastStartedAt);
    if (wait > 0) {
      await sleep(wait);
    }
    this.lastStartedAt = Date.now();
    const startedAt = this.lastStartedAt;

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': this.userAgent,
          Accept: 'application/json',
          'Accept-Encoding': 'gzip, deflate',
        },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      const durationMs = Date.now() - startedAt;

      if (response.status === 403 || response.status === 429) {
        this.logger.warn(
          `source=SEC_EDGAR operation=${operation} outcome=rate_limited status=${response.status} durationMs=${durationMs}`,
        );
        return {
          outcome: 'rate_limited',
          httpStatus: response.status,
          message: 'SEC request was rate limited',
        };
      }

      if (!response.ok) {
        this.logger.warn(
          `source=SEC_EDGAR operation=${operation} outcome=error status=${response.status} durationMs=${durationMs}`,
        );
        return {
          outcome: 'error',
          httpStatus: response.status,
          message: 'SEC request failed',
        };
      }

      const json: unknown = await response.json();
      this.logger.log(
        `source=SEC_EDGAR operation=${operation} outcome=ok status=${response.status} durationMs=${durationMs}`,
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
          `source=SEC_EDGAR operation=${operation} outcome=timeout durationMs=${durationMs}`,
        );
        return { outcome: 'timeout', message: 'SEC request timed out' };
      }

      this.logger.warn(
        `source=SEC_EDGAR operation=${operation} outcome=error durationMs=${durationMs}`,
      );
      return { outcome: 'error', message: 'SEC request failed' };
    }
  }
}
