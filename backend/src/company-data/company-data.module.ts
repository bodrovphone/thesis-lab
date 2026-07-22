import { Module } from '@nestjs/common';
import { CompanyDataAggregatorService } from './company-data-aggregator.service';
import { CompanyDataCacheService } from './cache/company-data-cache.service';
import { FinnhubAdapter } from './finnhub/finnhub.adapter';
import { FinnhubRequestSchedulerService } from './finnhub/finnhub-request-scheduler.service';
import { FinnhubSearchCacheService } from './finnhub/finnhub-search-cache.service';
import { SecEdgarAdapter } from './sec-edgar/sec-edgar.adapter';
import { SecRequestSchedulerService } from './sec-edgar/sec-request-scheduler.service';
import { AlphaVantageAdapter } from './alpha-vantage/alpha-vantage.adapter';
import { AlphaVantageBudgetService } from './alpha-vantage/alpha-vantage-budget.service';
import { AlphaVantageRequestSchedulerService } from './alpha-vantage/alpha-vantage-request-scheduler.service';

@Module({
  providers: [
    CompanyDataAggregatorService,
    CompanyDataCacheService,
    SecEdgarAdapter,
    SecRequestSchedulerService,
    FinnhubAdapter,
    FinnhubRequestSchedulerService,
    FinnhubSearchCacheService,
    AlphaVantageBudgetService,
    AlphaVantageRequestSchedulerService,
    AlphaVantageAdapter,
  ],
  exports: [CompanyDataAggregatorService],
})
export class CompanyDataModule {}
