import { Controller, Get } from '@nestjs/common';
import { TaxonomyService, type TaxonomyViewDto } from './taxonomy.service';

@Controller('tags')
export class TaxonomyController {
  constructor(private readonly taxonomyService: TaxonomyService) {}

  @Get()
  findAll(): TaxonomyViewDto {
    return this.taxonomyService.findAll();
  }
}
