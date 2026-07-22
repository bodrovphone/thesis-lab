import { Injectable } from '@nestjs/common';
import {
  BUSINESS_MODEL_OPTIONS,
  CONVICTION_LEVEL_OPTIONS,
  MOAT_PATTERN_OPTIONS,
  type TaxonomyOptionDto,
} from './taxonomy.constants';

export interface TaxonomyViewDto {
  moatPatterns: TaxonomyOptionDto[];
  businessModels: TaxonomyOptionDto[];
  convictionLevels: TaxonomyOptionDto[];
}

@Injectable()
export class TaxonomyService {
  findAll(): TaxonomyViewDto {
    return {
      moatPatterns: MOAT_PATTERN_OPTIONS,
      businessModels: BUSINESS_MODEL_OPTIONS,
      convictionLevels: CONVICTION_LEVEL_OPTIONS,
    };
  }
}
