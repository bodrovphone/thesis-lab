import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import {
  BusinessModel,
  ConvictionLevel,
  MoatPattern,
} from '../../generated/prisma/client';

function normalizeEnumArray(value: unknown): unknown {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  if (Array.isArray(value)) {
    return value;
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
  return value;
}

export class ListCompaniesQueryDto {
  @IsOptional()
  @IsEnum(ConvictionLevel)
  conviction?: ConvictionLevel;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => normalizeEnumArray(value))
  @IsEnum(MoatPattern, { each: true })
  moatPattern?: MoatPattern[];

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => normalizeEnumArray(value))
  @IsEnum(BusinessModel, { each: true })
  businessModel?: BusinessModel[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 100;
}
