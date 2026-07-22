import { Injectable } from '@nestjs/common';
import type { Company } from '../generated/prisma/client';
import type { CompanyViewDto } from './dto/company-view.dto';

@Injectable()
export class CompanySerializer {
  toView(company: Company): CompanyViewDto {
    return {
      id: company.id,
      ticker: company.ticker,
      name: company.name,
      cik: company.cik,
      exchange: company.exchange,
      sector: company.sector,
      industry: company.industry,
      description: company.description,
      country: company.country,
      marketCapUsd:
        company.marketCapUsd !== null ? company.marketCapUsd.toString() : null,
      website: company.website,
      logoUrl: company.logoUrl,
      convictionLevel: company.convictionLevel,
      sourcesUsed: company.sourcesUsed,
      enrichmentStatus: company.enrichmentStatus,
      lastEnrichedAt: company.lastEnrichedAt
        ? company.lastEnrichedAt.toISOString()
        : null,
      currentThinkingSummary: company.currentThinkingSummary,
      summaryGeneratedAt: company.summaryGeneratedAt
        ? company.summaryGeneratedAt.toISOString()
        : null,
      createdAt: company.createdAt.toISOString(),
      updatedAt: company.updatedAt.toISOString(),
    };
  }
}
