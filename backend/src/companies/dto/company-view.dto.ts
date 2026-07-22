import type {
  ConvictionLevel,
  DataSource,
  EnrichmentStatus,
} from '../../generated/prisma/client';

export interface CompanyViewDto {
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
  sourcesUsed: DataSource[];
  enrichmentStatus: EnrichmentStatus;
  lastEnrichedAt: string | null;
  currentThinkingSummary: string | null;
  summaryGeneratedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
