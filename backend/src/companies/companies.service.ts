import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { ConvictionLevel } from '../generated/prisma/client';
import { CompanyDataAggregatorService } from '../company-data/company-data-aggregator.service';
import { mergeCompanyProfile } from '../company-data/merge/merge-company-profile';
import type { CompanySearchCandidate } from '../company-data/types/company-data.types';
import { DataSource, Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CompanySerializer } from './company.serializer';
import type { CompanyViewDto } from './dto/company-view.dto';

@Injectable()
export class CompaniesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aggregator: CompanyDataAggregatorService,
    private readonly serializer: CompanySerializer,
  ) {}

  searchExternal(
    query: string,
    limit: number,
  ): Promise<CompanySearchCandidate[]> {
    return this.aggregator.searchCandidates(query, limit);
  }

  async create(ticker: string): Promise<CompanyViewDto> {
    const normalizedTicker = ticker.trim().toUpperCase();

    const existing = await this.prisma.company.findUnique({
      where: { ticker: normalizedTicker },
    });
    if (existing) {
      throw new ConflictException('Company is already tracked');
    }

    const candidate = await this.aggregator.resolveCandidate(normalizedTicker);
    if (!candidate) {
      throw new NotFoundException('Ticker not found in company sources');
    }

    const profileResults = await this.aggregator.fetchProfiles(candidate);
    const now = new Date();
    const merged = mergeCompanyProfile(candidate, profileResults, now);

    try {
      const company = await this.prisma.company.create({
        data: {
          ticker: merged.ticker,
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
        },
      });

      return this.serializer.toView(company);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Company is already tracked');
      }
      throw error;
    }
  }

  async findAll(): Promise<CompanyViewDto[]> {
    const companies = await this.prisma.company.findMany({
      orderBy: [{ updatedAt: 'desc' }, { ticker: 'asc' }],
    });
    return companies.map((company) => this.serializer.toView(company));
  }

  async findOne(id: string): Promise<CompanyViewDto | null> {
    const company = await this.prisma.company.findUnique({
      where: { id },
      include: {
        notes: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    return company
      ? this.serializer.toView(company, company.notes)
      : null;
  }

  async updateConviction(
    id: string,
    convictionLevel: ConvictionLevel,
  ): Promise<CompanyViewDto> {
    try {
      const company = await this.prisma.company.update({
        where: { id },
        data: { convictionLevel },
        include: {
          notes: {
            orderBy: { createdAt: 'desc' },
          },
        },
      });
      return this.serializer.toView(company, company.notes);
    } catch {
      throw new NotFoundException('Company not found');
    }
  }
}
