import { Injectable } from '@nestjs/common';
import { DataSource } from '../../generated/prisma/client';
import type { CompanyDataAdapter } from '../types/company-data-adapter.interface';
import type {
  AdapterResult,
  CompanySearchCandidate,
  NormalizedCompanyProfile,
} from '../types/company-data.types';
import { CompanyDataCacheService } from '../cache/company-data-cache.service';
import { SecRequestSchedulerService } from './sec-request-scheduler.service';

const TICKER_DATASET_URL =
  'https://www.sec.gov/files/company_tickers_exchange.json';
const TICKER_CACHE_KEY = 'company_tickers_exchange:v1';
const TICKER_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const REQUIRED_TICKER_FIELDS = ['cik', 'name', 'ticker', 'exchange'] as const;

export interface SecTickerExchangePayload {
  fields: string[];
  data: unknown[][];
}

export interface SecTickerRecord {
  cik: string;
  name: string;
  ticker: string;
  exchange: string | null;
}

export interface SecSubmissionsPayload {
  cik: string;
  name: string;
  tickers?: string[];
  exchanges?: string[];
  sic?: string;
  sicDescription?: string;
}

export function validateTickerExchangePayload(
  raw: unknown,
): SecTickerExchangePayload {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('SEC ticker payload was not an object');
  }

  const candidate = raw as Record<string, unknown>;
  const { fields, data } = candidate;

  if (!Array.isArray(fields) || !fields.every((f) => typeof f === 'string')) {
    throw new Error('SEC ticker payload had an invalid fields array');
  }

  for (const required of REQUIRED_TICKER_FIELDS) {
    if (!fields.includes(required)) {
      throw new Error(
        `SEC ticker payload is missing required field ${required}`,
      );
    }
  }

  if (!Array.isArray(data)) {
    throw new Error('SEC ticker payload had an invalid data array');
  }

  for (const row of data) {
    if (!Array.isArray(row) || row.length !== fields.length) {
      throw new Error('SEC ticker payload contained a malformed row');
    }
  }

  return { fields, data: data as unknown[][] };
}

export function normalizeTickerRecords(
  payload: SecTickerExchangePayload,
): SecTickerRecord[] {
  const cikIndex = payload.fields.indexOf('cik');
  const nameIndex = payload.fields.indexOf('name');
  const tickerIndex = payload.fields.indexOf('ticker');
  const exchangeIndex = payload.fields.indexOf('exchange');

  const records: SecTickerRecord[] = [];

  for (const row of payload.data) {
    const cikValue = row[cikIndex];
    const nameValue = row[nameIndex];
    const tickerValue = row[tickerIndex];
    const exchangeValue = row[exchangeIndex];

    if (
      (typeof cikValue !== 'number' && typeof cikValue !== 'string') ||
      typeof nameValue !== 'string' ||
      typeof tickerValue !== 'string' ||
      (exchangeValue !== null && typeof exchangeValue !== 'string')
    ) {
      continue;
    }

    records.push({
      cik: String(cikValue).padStart(10, '0'),
      name: nameValue,
      ticker: tickerValue.toUpperCase(),
      exchange: exchangeValue,
    });
  }

  return records;
}

export function rankCandidates(
  records: SecTickerRecord[],
  query: string,
  limit: number,
): SecTickerRecord[] {
  const normalizedQuery = query.trim().toLowerCase();
  const upperQuery = normalizedQuery.toUpperCase();

  const scored: Array<{ record: SecTickerRecord; tier: number }> = [];

  for (const record of records) {
    const nameLower = record.name.toLowerCase();

    let tier: number | null = null;
    if (record.ticker === upperQuery) {
      tier = 0;
    } else if (record.ticker.startsWith(upperQuery)) {
      tier = 1;
    } else if (nameLower.startsWith(normalizedQuery)) {
      tier = 2;
    } else if (nameLower.includes(normalizedQuery)) {
      tier = 3;
    }

    if (tier !== null) {
      scored.push({ record, tier });
    }
  }

  scored.sort((a, b) => {
    if (a.tier !== b.tier) {
      return a.tier - b.tier;
    }
    return a.record.ticker.localeCompare(b.record.ticker);
  });

  return scored.slice(0, limit).map((entry) => entry.record);
}

export function validateSubmissionsPayload(
  raw: unknown,
): SecSubmissionsPayload {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('SEC submissions payload was not an object');
  }

  const candidate = raw as Record<string, unknown>;
  if (typeof candidate.cik !== 'string' || typeof candidate.name !== 'string') {
    throw new Error('SEC submissions payload is missing required fields');
  }

  return {
    cik: candidate.cik,
    name: candidate.name,
    tickers: Array.isArray(candidate.tickers)
      ? (candidate.tickers as string[])
      : undefined,
    exchanges: Array.isArray(candidate.exchanges)
      ? (candidate.exchanges as string[])
      : undefined,
    sic: typeof candidate.sic === 'string' ? candidate.sic : undefined,
    sicDescription:
      typeof candidate.sicDescription === 'string'
        ? candidate.sicDescription
        : undefined,
  };
}

@Injectable()
export class SecEdgarAdapter implements CompanyDataAdapter {
  readonly source = DataSource.SEC_EDGAR;

  constructor(
    private readonly cache: CompanyDataCacheService,
    private readonly scheduler: SecRequestSchedulerService,
  ) {}

  async search(
    query: string,
    limit: number,
  ): Promise<AdapterResult<CompanySearchCandidate[]>> {
    try {
      const records = await this.getTickerRecords();
      const candidates = rankCandidates(records, query, limit).map((record) =>
        this.toCandidate(record),
      );
      return {
        source: this.source,
        status: 'ok',
        data: candidates,
      };
    } catch (error) {
      return {
        source: this.source,
        status: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'SEC company directory is unavailable',
      };
    }
  }

  async resolveTicker(
    ticker: string,
  ): Promise<AdapterResult<CompanySearchCandidate | null>> {
    try {
      const records = await this.getTickerRecords();
      const upperTicker = ticker.trim().toUpperCase();
      const match = records.find((record) => record.ticker === upperTicker);
      return {
        source: this.source,
        status: 'ok',
        data: match ? this.toCandidate(match) : null,
      };
    } catch (error) {
      return {
        source: this.source,
        status: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'SEC company directory is unavailable',
      };
    }
  }

  async fetchProfile(
    candidate: CompanySearchCandidate,
  ): Promise<AdapterResult<NormalizedCompanyProfile>> {
    if (!candidate.cik) {
      return {
        source: this.source,
        status: 'error',
        message: 'SEC profile requires CIK',
      };
    }

    const url = `https://data.sec.gov/submissions/CIK${candidate.cik}.json`;
    const result = await this.scheduler.fetchJson(url, 'submissions_profile');

    if (result.outcome !== 'ok') {
      return {
        source: this.source,
        status: result.outcome,
        message: result.message,
      };
    }

    try {
      const submissions = validateSubmissionsPayload(result.json);
      return {
        source: this.source,
        status: 'ok',
        data: {
          ticker: candidate.ticker,
          name: submissions.name,
          cik: candidate.cik,
          exchange: candidate.exchange,
          industry: submissions.sicDescription ?? null,
          country: null,
          marketCapUsd: null,
          website: null,
          logoUrl: null,
        },
      };
    } catch {
      return {
        source: this.source,
        status: 'error',
        message: 'SEC submissions payload was invalid',
      };
    }
  }

  private async getTickerRecords(): Promise<SecTickerRecord[]> {
    const payload = await this.cache.getOrRefresh<SecTickerExchangePayload>({
      source: DataSource.SEC_EDGAR,
      cacheKey: TICKER_CACHE_KEY,
      ttlMs: TICKER_CACHE_TTL_MS,
      refresh: () => this.fetchTickerDataset(),
    });
    return normalizeTickerRecords(payload);
  }

  private async fetchTickerDataset(): Promise<SecTickerExchangePayload> {
    const result = await this.scheduler.fetchJson(
      TICKER_DATASET_URL,
      'ticker_directory',
    );
    if (result.outcome !== 'ok') {
      throw new Error(result.message);
    }
    return validateTickerExchangePayload(result.json);
  }

  private toCandidate(record: SecTickerRecord): CompanySearchCandidate {
    return {
      ticker: record.ticker,
      name: record.name,
      cik: record.cik,
      exchange: record.exchange,
      sources: ['SEC_EDGAR'],
    };
  }
}
