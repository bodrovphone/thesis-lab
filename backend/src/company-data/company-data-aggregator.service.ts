import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import type { CompanyDataAggregator } from './types/company-data-adapter.interface';
import type {
  AdapterResult,
  CompanySearchCandidate,
  DataSourceName,
  NormalizedCompanyProfile,
} from './types/company-data.types';
import { SecEdgarAdapter } from './sec-edgar/sec-edgar.adapter';
import { FinnhubAdapter } from './finnhub/finnhub.adapter';

const SOURCE_ORDER: DataSourceName[] = ['SEC_EDGAR', 'FINNHUB'];

function settledToResult<T>(
  source: DataSourceName,
  outcome: PromiseSettledResult<AdapterResult<T>>,
): AdapterResult<T> {
  if (outcome.status === 'fulfilled') {
    return outcome.value;
  }
  return {
    source,
    status: 'error',
    message: 'Adapter request failed unexpectedly',
  };
}

export function mergeSearchCandidates(
  groups: Map<string, CompanySearchCandidate[]>,
): CompanySearchCandidate[] {
  return [...groups.values()].map((group) => {
    const ticker = group[0].ticker.trim().toUpperCase();
    const sec = group.find((candidate) =>
      candidate.sources.includes('SEC_EDGAR'),
    );
    const finnhub = group.find((candidate) =>
      candidate.sources.includes('FINNHUB'),
    );

    return {
      ticker,
      name: finnhub?.name ?? sec?.name ?? group[0].name,
      cik: sec?.cik ?? null,
      exchange: sec?.exchange ?? finnhub?.exchange ?? null,
      sources: SOURCE_ORDER.filter((source) =>
        group.some((candidate) => candidate.sources.includes(source)),
      ),
    };
  });
}

export function rankMergedCandidates(
  candidates: CompanySearchCandidate[],
  query: string,
  limit: number,
): CompanySearchCandidate[] {
  const normalizedQuery = query.trim().toLowerCase();
  const upperQuery = normalizedQuery.toUpperCase();

  const scored: Array<{ candidate: CompanySearchCandidate; tier: number }> = [];

  for (const candidate of candidates) {
    const nameLower = candidate.name.toLowerCase();
    let tier: number | null = null;

    if (candidate.ticker === upperQuery) {
      tier = 0;
    } else if (candidate.ticker.startsWith(upperQuery)) {
      tier = 1;
    } else if (nameLower.startsWith(normalizedQuery)) {
      tier = 2;
    } else if (nameLower.includes(normalizedQuery)) {
      tier = 3;
    }

    if (tier !== null) {
      scored.push({ candidate, tier });
    }
  }

  scored.sort((left, right) => {
    if (left.tier !== right.tier) {
      return left.tier - right.tier;
    }

    const leftDual = left.candidate.sources.length > 1 ? 0 : 1;
    const rightDual = right.candidate.sources.length > 1 ? 0 : 1;
    if (leftDual !== rightDual) {
      return leftDual - rightDual;
    }

    return left.candidate.ticker.localeCompare(right.candidate.ticker);
  });

  return scored.slice(0, limit).map((entry) => entry.candidate);
}

function mergeResolvedCandidates(
  sec: CompanySearchCandidate | null,
  finnhub: CompanySearchCandidate | null,
): CompanySearchCandidate | null {
  if (!sec && !finnhub) {
    return null;
  }

  const ticker = (sec?.ticker ?? finnhub?.ticker ?? '').trim().toUpperCase();
  return {
    ticker,
    name: finnhub?.name ?? sec?.name ?? ticker,
    cik: sec?.cik ?? null,
    exchange: sec?.exchange ?? finnhub?.exchange ?? null,
    sources: SOURCE_ORDER.filter((source) => {
      if (source === 'SEC_EDGAR' && sec) {
        return true;
      }
      if (source === 'FINNHUB' && finnhub) {
        return true;
      }
      return false;
    }),
  };
}

@Injectable()
export class CompanyDataAggregatorService implements CompanyDataAggregator {
  private readonly adapters: [SecEdgarAdapter, FinnhubAdapter];

  constructor(
    secEdgarAdapter: SecEdgarAdapter,
    finnhubAdapter: FinnhubAdapter,
  ) {
    this.adapters = [secEdgarAdapter, finnhubAdapter];
  }

  async searchCandidates(
    query: string,
    limit: number,
  ): Promise<CompanySearchCandidate[]> {
    const [secOutcome, finnhubOutcome] = await Promise.allSettled([
      this.adapters[0].search(query, limit),
      this.adapters[1].search(query, limit),
    ]);

    const secResult = settledToResult('SEC_EDGAR', secOutcome);
    const finnhubResult = settledToResult('FINNHUB', finnhubOutcome);

    if (secResult.status !== 'ok' && finnhubResult.status !== 'ok') {
      throw new ServiceUnavailableException('Company search is unavailable');
    }

    const flattened: CompanySearchCandidate[] = [];
    if (secResult.status === 'ok') {
      flattened.push(...secResult.data);
    }
    if (finnhubResult.status === 'ok') {
      flattened.push(...finnhubResult.data);
    }

    const groups = new Map<string, CompanySearchCandidate[]>();
    for (const candidate of flattened) {
      const key = candidate.ticker.trim().toUpperCase();
      const existing = groups.get(key) ?? [];
      existing.push(candidate);
      groups.set(key, existing);
    }

    const merged = mergeSearchCandidates(groups);
    return rankMergedCandidates(merged, query, limit);
  }

  async resolveCandidate(
    ticker: string,
  ): Promise<CompanySearchCandidate | null> {
    const normalizedTicker = ticker.trim().toUpperCase();
    const [secOutcome, finnhubOutcome] = await Promise.allSettled([
      this.adapters[0].resolveTicker(normalizedTicker),
      this.adapters[1].resolveTicker(normalizedTicker),
    ]);

    const secResult = settledToResult('SEC_EDGAR', secOutcome);
    const finnhubResult = settledToResult('FINNHUB', finnhubOutcome);

    if (secResult.status !== 'ok' && finnhubResult.status !== 'ok') {
      throw new ServiceUnavailableException('Company search is unavailable');
    }

    if (
      secResult.status === 'ok' &&
      secResult.data === null &&
      finnhubResult.status !== 'ok'
    ) {
      throw new ServiceUnavailableException('Company search is unavailable');
    }

    const secCandidate = secResult.status === 'ok' ? secResult.data : null;
    const finnhubCandidate =
      finnhubResult.status === 'ok' ? finnhubResult.data : null;

    if (!secCandidate && !finnhubCandidate) {
      return null;
    }

    return mergeResolvedCandidates(secCandidate, finnhubCandidate);
  }

  async fetchProfiles(
    candidate: CompanySearchCandidate,
  ): Promise<AdapterResult<NormalizedCompanyProfile>[]> {
    const [secOutcome, finnhubOutcome] = await Promise.allSettled([
      this.adapters[0].fetchProfile(candidate),
      this.adapters[1].fetchProfile(candidate),
    ]);

    return [
      settledToResult('SEC_EDGAR', secOutcome),
      settledToResult('FINNHUB', finnhubOutcome),
    ];
  }
}
