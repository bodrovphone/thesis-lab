import type {
  AdapterResult,
  CompanySearchCandidate,
  DataSourceName,
  NormalizedCompanyProfile,
} from './company-data.types';

export interface CompanyDataAdapter {
  readonly source: DataSourceName;
  search(query: string, limit: number): Promise<CompanySearchCandidate[]>;
  fetchProfile(
    candidate: CompanySearchCandidate,
  ): Promise<AdapterResult<NormalizedCompanyProfile>>;
}

export interface CompanyDataAggregator {
  searchCandidates(
    query: string,
    limit: number,
  ): Promise<CompanySearchCandidate[]>;
  resolveCandidate(ticker: string): Promise<CompanySearchCandidate | null>;
  fetchProfile(
    candidate: CompanySearchCandidate,
  ): Promise<AdapterResult<NormalizedCompanyProfile>>;
}
