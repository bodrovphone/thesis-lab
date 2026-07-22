import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './config/env.validation';
import { CompaniesModule } from './companies/companies.module';
import { CompanyDataModule } from './company-data/company-data.module';
import { HealthModule } from './health/health.module';
import { NotesModule } from './notes/notes.module';
import { PrismaModule } from './prisma/prisma.module';
import { TaxonomyModule } from './taxonomy/taxonomy.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
      validate: validateEnv,
    }),
    PrismaModule,
    HealthModule,
    CompanyDataModule,
    CompaniesModule,
    NotesModule,
    TaxonomyModule,
  ],
})
export class AppModule {}
