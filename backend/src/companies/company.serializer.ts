import { Injectable } from '@nestjs/common';
import type { Company, Note } from '../generated/prisma/client';
import { NoteSerializer } from '../notes/note.serializer';
import type { CompanyViewDto } from './dto/company-view.dto';

@Injectable()
export class CompanySerializer {
  constructor(private readonly noteSerializer: NoteSerializer) {}

  toView(company: Company, notes?: Note[]): CompanyViewDto {
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
      ...(notes !== undefined
        ? { notes: notes.map((note) => this.noteSerializer.toView(note)) }
        : {}),
    };
  }
}
