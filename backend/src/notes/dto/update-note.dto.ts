import { IsEnum, IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator';
import { BusinessModel, MoatPattern } from '../../generated/prisma/client';
import { NOTE_BODY_MAX_LENGTH } from '../constants';

export class UpdateNoteDto {
  @IsOptional()
  @IsString()
  @MaxLength(NOTE_BODY_MAX_LENGTH)
  body?: string;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsEnum(MoatPattern)
  moatPattern?: MoatPattern | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsEnum(BusinessModel)
  businessModel?: BusinessModel | null;
}
