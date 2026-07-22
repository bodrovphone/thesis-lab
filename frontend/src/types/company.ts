import type { NoteView } from './note';

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
  notes?: NoteView[];
}

export interface CompanySearchCandidate {
  ticker: string;
  name: string;
  cik: string | null;
  exchange: string | null;
  sources: DataSourceName[];
}

export function formatMarketCapUsd(value: string | null): string | null {
  if (!value) {
    return null;
  }

  try {
    const amount = BigInt(value);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(Number(amount));
  } catch {
    return null;
  }
}

export function formatSourceLabel(source: DataSourceName): string {
  switch (source) {
    case 'SEC_EDGAR':
      return 'SEC';
    case 'FINNHUB':
      return 'Finnhub';
    case 'ALPHA_VANTAGE':
      return 'Alpha Vantage';
  }
}

export function formatEnrichmentBadge(status: EnrichmentStatus): string {
  switch (status) {
    case 'COMPLETE':
      return 'Complete profile';
    case 'PARTIAL':
      return 'Partial profile';
    case 'FAILED':
      return 'Profile unavailable';
  }
}
