import {
  Body,
  Controller,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { SearchExternalQueryDto } from './dto/search-external-query.dto';
import type { SearchCandidateDto } from './dto/search-candidate.dto';
import type { CompanyViewDto } from './dto/company-view.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { UpdateCompanySummaryDto } from './dto/update-company-summary.dto';

@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Get('search-external')
  async searchExternal(
    @Query() query: SearchExternalQueryDto,
  ): Promise<{ items: SearchCandidateDto[] }> {
    const items = await this.companiesService.searchExternal(
      query.q,
      query.limit,
    );
    return { items };
  }

  @Post()
  @HttpCode(201)
  create(@Body() dto: CreateCompanyDto): Promise<CompanyViewDto> {
    return this.companiesService.create(dto.ticker);
  }

  @Get()
  async findAll(): Promise<{ items: CompanyViewDto[] }> {
    const items = await this.companiesService.findAll();
    return { items };
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<CompanyViewDto> {
    const company = await this.companiesService.findOne(id);
    if (!company) {
      throw new NotFoundException('Company not found');
    }
    return company;
  }

  @Patch(':id/summary')
  updateSummary(
    @Param('id') id: string,
    @Body() dto: UpdateCompanySummaryDto,
  ): Promise<CompanyViewDto> {
    return this.companiesService.updateSummary(id, dto.currentThinkingSummary);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCompanyDto,
  ): Promise<CompanyViewDto> {
    return this.companiesService.updateConviction(id, dto.convictionLevel);
  }
}
