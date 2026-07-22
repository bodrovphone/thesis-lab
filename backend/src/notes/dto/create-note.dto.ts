import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { BusinessModel, MoatPattern } from '../../generated/prisma/client';
import { NOTE_BODY_MAX_LENGTH } from '../constants';

export class CreateNoteDto {
  @IsString()
  @MaxLength(NOTE_BODY_MAX_LENGTH)
  body!: string;

  @IsOptional()
  @IsEnum(MoatPattern)
  moatPattern?: MoatPattern;

  @IsOptional()
  @IsEnum(BusinessModel)
  businessModel?: BusinessModel;
}
