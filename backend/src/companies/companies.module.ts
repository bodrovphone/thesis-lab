import { Module } from '@nestjs/common';
import { CompanyDataModule } from '../company-data/company-data.module';
import { CompaniesController } from './companies.controller';
import { CompaniesService } from './companies.service';
import { CompanySerializer } from './company.serializer';

@Module({
  imports: [CompanyDataModule],
  controllers: [CompaniesController],
  providers: [CompaniesService, CompanySerializer],
})
export class CompaniesModule {}
