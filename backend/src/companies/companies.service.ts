import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { ConvictionLevel } from '../generated/prisma/client';
import { CompanyDataAggregatorService } from '../company-data/company-data-aggregator.service';
import { mergeCompanyProfile } from '../company-data/merge/merge-company-profile';
import type { CompanySearchCandidate } from '../company-data/types/company-data.types';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { rethrowMappedPrismaError } from '../prisma/prisma-errors';
import {
  toCompanyCreateData,
  toCompanyEnrichmentUpdateData,
} from './company-write-data';
import { CompanySerializer } from './company.serializer';
import type { CompanyViewDto } from './dto/company-view.dto';
import { ListCompaniesQueryDto } from './dto/list-companies-query.dto';

export interface CompanyListResult {
  items: CompanyViewDto[];
  totalTracked: number;
}

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
        data: toCompanyCreateData(merged),
      });

      return this.serializer.toView(company);
    } catch (error) {
      rethrowMappedPrismaError(error, {
        notFoundMessage: 'Company not found',
        conflictMessage: 'Company is already tracked',
      });
    }
  }

  async findAll(
    query: ListCompaniesQueryDto = new ListCompaniesQueryDto(),
  ): Promise<CompanyListResult> {
    const totalTracked = await this.prisma.company.count();
    const andConditions: Prisma.CompanyWhereInput[] = [];

    if (query.conviction) {
      andConditions.push({ convictionLevel: query.conviction });
    }

    if (query.moatPattern?.length) {
      andConditions.push({
        notes: { some: { moatPattern: { in: query.moatPattern } } },
      });
    }

    if (query.businessModel?.length) {
      andConditions.push({
        notes: { some: { businessModel: { in: query.businessModel } } },
      });
    }

    const where: Prisma.CompanyWhereInput =
      andConditions.length > 0 ? { AND: andConditions } : {};

    const companies = await this.prisma.company.findMany({
      where,
      orderBy: [{ updatedAt: 'desc' }, { ticker: 'asc' }],
      take: query.limit ?? 100,
    });

    return {
      items: companies.map((company) => this.serializer.toView(company)),
      totalTracked,
    };
  }

  async findOne(id: string): Promise<CompanyViewDto> {
    const company = await this.prisma.company.findUnique({
      where: { id },
      include: {
        notes: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!company) {
      throw new NotFoundException('Company not found');
    }
    return this.serializer.toView(company, company.notes);
  }

  async refreshEnrichment(id: string): Promise<CompanyViewDto> {
    const existing = await this.prisma.company.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Company not found');
    }

    const candidate = await this.aggregator.resolveCandidate(existing.ticker);
    if (!candidate) {
      throw new NotFoundException('Ticker not found in company sources');
    }

    const merged = mergeCompanyProfile(
      candidate,
      await this.aggregator.fetchProfiles(candidate),
      new Date(),
    );

    try {
      const company = await this.prisma.company.update({
        where: { id },
        data: toCompanyEnrichmentUpdateData(merged),
        include: { notes: { orderBy: { createdAt: 'desc' } } },
      });
      return this.serializer.toView(company, company.notes);
    } catch (error) {
      rethrowMappedPrismaError(error, {
        notFoundMessage: 'Company not found',
      });
    }
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
    } catch (error) {
      rethrowMappedPrismaError(error, {
        notFoundMessage: 'Company not found',
      });
    }
  }

  async updateSummary(
    id: string,
    currentThinkingSummary: string,
  ): Promise<CompanyViewDto> {
    try {
      const company = await this.prisma.company.update({
        where: { id },
        data: {
          currentThinkingSummary: currentThinkingSummary.trim(),
          summaryGeneratedAt: new Date(),
        },
        include: {
          notes: {
            orderBy: { createdAt: 'desc' },
          },
        },
      });
      return this.serializer.toView(company, company.notes);
    } catch (error) {
      rethrowMappedPrismaError(error, {
        notFoundMessage: 'Company not found',
      });
    }
  }
}
