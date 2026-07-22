export type ConvictionLevel =
  | 'WATCHING'
  | 'BUILDING_CONVICTION'
  | 'HIGH_CONVICTION';

export type EnrichmentStatus = 'COMPLETE' | 'PARTIAL' | 'FAILED';

export type DataSourceName = 'SEC_EDGAR' | 'FINNHUB' | 'ALPHA_VANTAGE';

export interface CompanyView {
  id: string;
  ticker: string;
  name: string;
  cik: string | null;
  exchange: string | null;
  sector: string | null;
  industry: string | null;
  description: string | null;
  country: string | null;
  marketCapUsd: string | null;
  website: string | null;
  logoUrl: string | null;
  convictionLevel: ConvictionLevel;
  sourcesUsed: DataSourceName[];
  enrichmentStatus: EnrichmentStatus;
  lastEnrichedAt: string | null;
  currentThinkingSummary: string | null;
  summaryGeneratedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CompanySearchCandidate {
  ticker: string;
  name: string;
  cik: string;
  exchange: string | null;
  source: DataSourceName;
}
