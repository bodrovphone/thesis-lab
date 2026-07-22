import { Module } from '@nestjs/common';
import { CompanyDataAggregatorService } from './company-data-aggregator.service';
import { CompanyDataCacheService } from './cache/company-data-cache.service';
import { SecEdgarAdapter } from './sec-edgar/sec-edgar.adapter';
import { SecRequestSchedulerService } from './sec-edgar/sec-request-scheduler.service';

@Module({
  providers: [
    CompanyDataAggregatorService,
    CompanyDataCacheService,
    SecEdgarAdapter,
    SecRequestSchedulerService,
  ],
  exports: [CompanyDataAggregatorService],
})
export class CompanyDataModule {}
