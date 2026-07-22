import { IsEnum } from 'class-validator';
import { ConvictionLevel } from '../../generated/prisma/client';

export class UpdateCompanyDto {
  @IsEnum(ConvictionLevel)
  convictionLevel!: ConvictionLevel;
}
