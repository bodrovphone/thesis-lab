export type DataSourceName = 'SEC_EDGAR' | 'FINNHUB' | 'ALPHA_VANTAGE';

export interface CompanySearchCandidate {
  ticker: string;
  name: string;
  cik: string | null;
  exchange: string | null;
  sources: DataSourceName[];
}

export interface NormalizedCompanyProfile {
  ticker: string;
  name: string;
  cik: string | null;
  exchange: string | null;
  sector: string | null;
  industry: string | null;
  description: string | null;
  country: string | null;
  marketCapUsd: bigint | null;
  website: string | null;
  logoUrl: string | null;
}

export type AdapterFailureStatus =
  'disabled' | 'error' | 'timeout' | 'rate_limited';

export type AdapterResult<T> =
  | { source: DataSourceName; status: 'ok'; data: T }
  | {
      source: DataSourceName;
      status: AdapterFailureStatus;
      message: string;
    };

export interface MergedCompanyProfile extends NormalizedCompanyProfile {
  sourcesUsed: DataSourceName[];
  enrichmentStatus: 'COMPLETE' | 'PARTIAL' | 'FAILED';
  lastEnrichedAt: Date | null;
}
