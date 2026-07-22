import { Injectable } from '@nestjs/common';
import type { CompanyDataAggregator } from './types/company-data-adapter.interface';
import type {
  AdapterResult,
  CompanySearchCandidate,
  NormalizedCompanyProfile,
} from './types/company-data.types';
import { SecEdgarAdapter } from './sec-edgar/sec-edgar.adapter';

/**
 * Fans out to every configured CompanyDataAdapter. Only SEC EDGAR exists
 * today, so this simply delegates — the AdapterResult envelope and source
 * tagging exist so a future adapter (Finnhub, etc.) can be added as a
 * settled parallel call without changing CompaniesService or controllers.
 */
@Injectable()
export class CompanyDataAggregatorService implements CompanyDataAggregator {
  constructor(private readonly secEdgarAdapter: SecEdgarAdapter) {}

  searchCandidates(
    query: string,
    limit: number,
  ): Promise<CompanySearchCandidate[]> {
    return this.secEdgarAdapter.search(query, limit);
  }

  resolveCandidate(ticker: string): Promise<CompanySearchCandidate | null> {
    return this.secEdgarAdapter.resolveTicker(ticker);
  }

  fetchProfile(
    candidate: CompanySearchCandidate,
  ): Promise<AdapterResult<NormalizedCompanyProfile>> {
    return this.secEdgarAdapter.fetchProfile(candidate);
  }
}
