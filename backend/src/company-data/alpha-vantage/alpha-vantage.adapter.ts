import { Injectable } from '@nestjs/common';
import type { CompanyDataAdapter } from '../types/company-data-adapter.interface';
import type {
  AdapterFailureStatus,
  AdapterResult,
  CompanySearchCandidate,
  NormalizedCompanyProfile,
} from '../types/company-data.types';
import { AlphaVantageRequestSchedulerService } from './alpha-vantage-request-scheduler.service';

export interface AlphaVantageOverviewPayload {
  Symbol?: string;
  Name?: string;
  Description?: string;
  Exchange?: string;
  Country?: string;
  Sector?: string;
  Industry?: string;
  MarketCapitalization?: string;
}

const PLACEHOLDER_VALUES = new Set(['none', '-', 'n/a', 'null']);

export function normalizeAlphaVantageString(
  value: string | undefined,
): string | null {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }
  if (PLACEHOLDER_VALUES.has(trimmed.toLowerCase())) {
    return null;
  }
  return trimmed;
}

export function parseAlphaVantageMarketCapUsd(
  value: string | undefined,
): bigint | null {
  const normalized = normalizeAlphaVantageString(value);
  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return BigInt(Math.round(parsed));
}

export function parseAlphaVantageOverviewPayload(
  raw: unknown,
  expectedTicker: string,
): NormalizedCompanyProfile | null {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('Alpha Vantage overview payload was not an object');
  }

  const payload = raw as AlphaVantageOverviewPayload;
  const symbol = normalizeAlphaVantageString(payload.Symbol)?.toUpperCase();
  const name = normalizeAlphaVantageString(payload.Name);

  if (!symbol && !name) {
    return null;
  }

  if (symbol && symbol !== expectedTicker.trim().toUpperCase()) {
    throw new Error('Alpha Vantage overview symbol did not match ticker');
  }

  if (!name) {
    throw new Error('Alpha Vantage overview payload is missing a usable name');
  }

  return {
    ticker: expectedTicker.trim().toUpperCase(),
    name,
    cik: null,
    exchange: normalizeAlphaVantageString(payload.Exchange),
    sector: normalizeAlphaVantageString(payload.Sector),
    industry: normalizeAlphaVantageString(payload.Industry),
    description: normalizeAlphaVantageString(payload.Description),
    country: normalizeAlphaVantageString(payload.Country),
    marketCapUsd: parseAlphaVantageMarketCapUsd(payload.MarketCapitalization),
    website: null,
    logoUrl: null,
  };
}

function mapFetchOutcome(
  outcome: Exclude<
    Awaited<ReturnType<AlphaVantageRequestSchedulerService['fetchOverview']>>['outcome'],
    'ok' | 'disabled'
  >,
): AdapterFailureStatus {
  return outcome;
}

@Injectable()
export class AlphaVantageAdapter implements CompanyDataAdapter {
  readonly source = 'ALPHA_VANTAGE' as const;

  constructor(private readonly scheduler: AlphaVantageRequestSchedulerService) {}

  search(): Promise<AdapterResult<CompanySearchCandidate[]>> {
    return Promise.resolve({
      source: this.source,
      status: 'disabled',
      message: 'Alpha Vantage does not support search',
    });
  }

  resolveTicker(): Promise<AdapterResult<CompanySearchCandidate | null>> {
    return Promise.resolve({
      source: this.source,
      status: 'disabled',
      message: 'Alpha Vantage does not support ticker resolution',
    });
  }

  async fetchProfile(
    candidate: CompanySearchCandidate,
  ): Promise<AdapterResult<NormalizedCompanyProfile>> {
    if (!this.scheduler.isEnabled()) {
      return {
        source: this.source,
        status: 'disabled',
        message: 'Alpha Vantage adapter is disabled',
      };
    }

    const result = await this.scheduler.fetchOverview(candidate.ticker);

    if (result.outcome === 'disabled') {
      return {
        source: this.source,
        status: 'disabled',
        message: result.message,
      };
    }

    if (result.outcome !== 'ok') {
      return {
        source: this.source,
        status: mapFetchOutcome(result.outcome),
        message: result.message,
      };
    }

    try {
      const profile = parseAlphaVantageOverviewPayload(
        result.json,
        candidate.ticker,
      );
      if (!profile) {
        return {
          source: this.source,
          status: 'error',
          message: 'Alpha Vantage overview payload had no usable data',
        };
      }

      return {
        source: this.source,
        status: 'ok',
        data: profile,
      };
    } catch {
      return {
        source: this.source,
        status: 'error',
        message: 'Alpha Vantage overview payload was invalid',
      };
    }
  }
}
