import type { MergedCompanyProfile } from '../company-data/types/company-data.types';
import { DataSource, type Prisma } from '../generated/prisma/client';

function toCompanyProfileFields(merged: MergedCompanyProfile) {
  return {
    name: merged.name,
    cik: merged.cik,
    exchange: merged.exchange,
    sector: merged.sector,
    industry: merged.industry,
    description: merged.description,
    country: merged.country,
    marketCapUsd: merged.marketCapUsd,
    website: merged.website,
    logoUrl: merged.logoUrl,
    sourcesUsed: merged.sourcesUsed.map((source) => DataSource[source]),
    enrichmentStatus: merged.enrichmentStatus,
    lastEnrichedAt: merged.lastEnrichedAt,
  };
}

export function toCompanyCreateData(
  merged: MergedCompanyProfile,
): Prisma.CompanyCreateInput {
  return {
    ticker: merged.ticker,
    ...toCompanyProfileFields(merged),
  };
}

export function toCompanyEnrichmentUpdateData(
  merged: MergedCompanyProfile,
): Prisma.CompanyUpdateInput {
  return toCompanyProfileFields(merged);
}
