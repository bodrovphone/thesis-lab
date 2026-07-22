export type DataSourceName = 'SEC_EDGAR';

export interface CompanySearchCandidate {
  ticker: string;
  name: string;
  cik: string;
  exchange: string | null;
  source: DataSourceName;
}

export interface NormalizedCompanyProfile {
  ticker: string;
  name: string;
  cik: string;
  exchange: string | null;
  industry: string | null;
}

export type AdapterResult<T> =
  | { source: DataSourceName; status: 'ok'; data: T }
  | {
      source: DataSourceName;
      status: 'error' | 'timeout' | 'rate_limited';
      message: string;
    };
