import { Module } from '@nestjs/common';
import { CompanyDataModule } from '../company-data/company-data.module';
import { NotesModule } from '../notes/notes.module';
import { CompaniesController } from './companies.controller';
import { CompaniesService } from './companies.service';
import { CompanySerializer } from './company.serializer';

@Module({
  imports: [CompanyDataModule, NotesModule],
  controllers: [CompaniesController],
  providers: [CompaniesService, CompanySerializer],
})
export class CompaniesModule {}
