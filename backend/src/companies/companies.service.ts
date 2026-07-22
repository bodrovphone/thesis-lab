import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CompanyDataAggregatorService } from '../company-data/company-data-aggregator.service';
import type { CompanySearchCandidate } from '../company-data/types/company-data.types';
import {
  DataSource,
  EnrichmentStatus,
  Prisma,
} from '../generated/prisma/client';
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
      throw new NotFoundException('Ticker not found in SEC directory');
    }

    const profileResult = await this.aggregator.fetchProfile(candidate);

    try {
      const company =
        profileResult.status === 'ok'
          ? await this.prisma.company.create({
              data: {
                ticker: candidate.ticker,
                name: profileResult.data.name,
                cik: candidate.cik,
                exchange: candidate.exchange,
                industry: profileResult.data.industry,
                sourcesUsed: [DataSource.SEC_EDGAR],
                enrichmentStatus: EnrichmentStatus.COMPLETE,
                lastEnrichedAt: new Date(),
              },
            })
          : await this.prisma.company.create({
              data: {
                ticker: candidate.ticker,
                name: candidate.name,
                cik: candidate.cik,
                exchange: candidate.exchange,
                sourcesUsed: [DataSource.SEC_EDGAR],
                enrichmentStatus: EnrichmentStatus.PARTIAL,
                lastEnrichedAt: null,
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
    const company = await this.prisma.company.findUnique({ where: { id } });
    return company ? this.serializer.toView(company) : null;
  }
}
