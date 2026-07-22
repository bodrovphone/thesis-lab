import { Injectable } from '@nestjs/common';
import type { CompanyDataAdapter } from '../types/company-data-adapter.interface';
import type {
  AdapterFailureStatus,
  AdapterResult,
  CompanySearchCandidate,
  NormalizedCompanyProfile,
} from '../types/company-data.types';
import { FinnhubRequestSchedulerService } from './finnhub-request-scheduler.service';
import { FinnhubSearchCacheService } from './finnhub-search-cache.service';

export interface FinnhubSearchPayload {
  count: number;
  result: Array<{
    description: string;
    displaySymbol: string;
    symbol: string;
    type: string;
  }>;
}

export interface FinnhubProfile2Payload {
  country?: string;
  currency?: string;
  exchange?: string;
  finnhubIndustry?: string;
  logo?: string;
  marketCapitalization?: number;
  name?: string;
  ticker?: string;
  weburl?: string;
}

export function normalizeFinnhubTicker(
  displaySymbol: string | undefined,
  symbol: string | undefined,
): string | null {
  const raw = displaySymbol?.trim() || symbol?.trim();
  if (!raw) {
    return null;
  }
  return raw.toUpperCase();
}

export function parseFinnhubSearchPayload(
  raw: unknown,
): CompanySearchCandidate[] {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('Finnhub search payload was not an object');
  }

  const payload = raw as FinnhubSearchPayload;
  if (!Array.isArray(payload.result)) {
    throw new Error('Finnhub search payload had an invalid result array');
  }

  const candidates: CompanySearchCandidate[] = [];

  for (const entry of payload.result) {
    const ticker = normalizeFinnhubTicker(entry.displaySymbol, entry.symbol);
    const name = entry.description?.trim();
    if (!ticker || !name) {
      continue;
    }

    candidates.push({
      ticker,
      name,
      cik: null,
      exchange: null,
      sources: ['FINNHUB'],
    });
  }

  return candidates;
}

export function convertFinnhubMarketCapUsd(
  currency: string | undefined,
  marketCapitalization: number | undefined,
): bigint | null {
  if (
    currency === 'USD' &&
    typeof marketCapitalization === 'number' &&
    Number.isFinite(marketCapitalization) &&
    marketCapitalization >= 0
  ) {
    return BigInt(Math.round(marketCapitalization * 1_000_000));
  }
  return null;
}

export function parseFinnhubProfile2Payload(
  raw: unknown,
  fallbackTicker: string,
): NormalizedCompanyProfile {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('Finnhub profile payload was not an object');
  }

  const payload = raw as FinnhubProfile2Payload;
  const ticker =
    normalizeFinnhubTicker(payload.ticker, fallbackTicker) ?? fallbackTicker;
  const name = payload.name?.trim();

  if (!name) {
    throw new Error('Finnhub profile payload is missing a usable name');
  }

  return {
    ticker,
    name,
    cik: null,
    exchange: payload.exchange?.trim() || null,
    sector: null,
    industry: payload.finnhubIndustry?.trim() || null,
    description: null,
    country: payload.country?.trim() || null,
    marketCapUsd: convertFinnhubMarketCapUsd(
      payload.currency,
      payload.marketCapitalization,
    ),
    website: payload.weburl?.trim() || null,
    logoUrl: payload.logo?.trim() || null,
  };
}

function mapFetchOutcome(
  outcome: 'error' | 'timeout' | 'rate_limited',
): AdapterFailureStatus {
  return outcome;
}

@Injectable()
export class FinnhubAdapter implements CompanyDataAdapter {
  readonly source = 'FINNHUB' as const;

  constructor(
    private readonly scheduler: FinnhubRequestSchedulerService,
    private readonly searchCache: FinnhubSearchCacheService,
  ) {}

  search(
    query: string,
    limit: number,
  ): Promise<AdapterResult<CompanySearchCandidate[]>> {
    if (!this.scheduler.isEnabled()) {
      return Promise.resolve({
        source: this.source,
        status: 'disabled',
        message: 'Finnhub adapter is disabled',
      });
    }

    return this.searchCache.getOrFetch(query, limit, () =>
      this.fetchSearch(query, limit),
    );
  }

  async resolveTicker(
    ticker: string,
  ): Promise<AdapterResult<CompanySearchCandidate | null>> {
    if (!this.scheduler.isEnabled()) {
      return {
        source: this.source,
        status: 'disabled',
        message: 'Finnhub adapter is disabled',
      };
    }

    const normalizedTicker = ticker.trim().toUpperCase();
    const path = `/search?q=${encodeURIComponent(normalizedTicker)}&exchange=US`;
    const result = await this.scheduler.fetchJson(
      path,
      'symbol_lookup',
      'profile',
    );

    if (result.outcome !== 'ok') {
      return {
        source: this.source,
        status: mapFetchOutcome(result.outcome),
        message: result.message,
      };
    }

    try {
      const candidates = parseFinnhubSearchPayload(result.json);
      const match = candidates.find(
        (candidate) => candidate.ticker === normalizedTicker,
      );
      return {
        source: this.source,
        status: 'ok',
        data: match ?? null,
      };
    } catch {
      return {
        source: this.source,
        status: 'error',
        message: 'Finnhub search payload was invalid',
      };
    }
  }

  async fetchProfile(
    candidate: CompanySearchCandidate,
  ): Promise<AdapterResult<NormalizedCompanyProfile>> {
    if (!this.scheduler.isEnabled()) {
      return {
        source: this.source,
        status: 'disabled',
        message: 'Finnhub adapter is disabled',
      };
    }

    const path = `/stock/profile2?symbol=${encodeURIComponent(candidate.ticker)}`;
    const result = await this.scheduler.fetchJson(path, 'profile2', 'profile');

    if (result.outcome !== 'ok') {
      return {
        source: this.source,
        status: mapFetchOutcome(result.outcome),
        message: result.message,
      };
    }

    if (
      typeof result.json === 'object' &&
      result.json !== null &&
      Object.keys(result.json).length === 0
    ) {
      return {
        source: this.source,
        status: 'error',
        message: 'Finnhub profile payload was empty',
      };
    }

    try {
      return {
        source: this.source,
        status: 'ok',
        data: parseFinnhubProfile2Payload(result.json, candidate.ticker),
      };
    } catch {
      return {
        source: this.source,
        status: 'error',
        message: 'Finnhub profile payload was invalid',
      };
    }
  }

  private async fetchSearch(
    query: string,
    limit: number,
  ): Promise<AdapterResult<CompanySearchCandidate[]>> {
    const path = `/search?q=${encodeURIComponent(query.trim())}&exchange=US`;
    const result = await this.scheduler.fetchJson(
      path,
      'symbol_search',
      'search',
    );

    if (result.outcome !== 'ok') {
      return {
        source: this.source,
        status: mapFetchOutcome(result.outcome),
        message: result.message,
      };
    }

    try {
      const candidates = parseFinnhubSearchPayload(result.json).slice(0, limit);
      return {
        source: this.source,
        status: 'ok',
        data: candidates,
      };
    } catch {
      return {
        source: this.source,
        status: 'error',
        message: 'Finnhub search payload was invalid',
      };
    }
  }
}
