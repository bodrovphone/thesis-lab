import { TaxonomyController } from './taxonomy.controller';
import {
  BUSINESS_MODEL_LABELS,
  CONVICTION_LEVEL_LABELS,
  MOAT_PATTERN_LABELS,
} from './taxonomy.constants';
import { TaxonomyService } from './taxonomy.service';

describe('TaxonomyController', () => {
  const service = new TaxonomyService();
  const controller = new TaxonomyController(service);

  it('returns all taxonomy dimensions with value and label pairs', () => {
    const result = controller.findAll();

    expect(result.moatPatterns).toHaveLength(
      Object.keys(MOAT_PATTERN_LABELS).length,
    );
    expect(result.businessModels).toHaveLength(
      Object.keys(BUSINESS_MODEL_LABELS).length,
    );
    expect(result.convictionLevels).toHaveLength(
      Object.keys(CONVICTION_LEVEL_LABELS).length,
    );

    for (const option of result.moatPatterns) {
      expect(option).toEqual({
        value: option.value,
        label:
          MOAT_PATTERN_LABELS[option.value as keyof typeof MOAT_PATTERN_LABELS],
      });
    }
  });
});
