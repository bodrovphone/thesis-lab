import { Type } from 'class-transformer';
import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { BusinessModel, MoatPattern } from '../../generated/prisma/client';
import { NOTE_BODY_MAX_LENGTH } from '../constants';
import { NoteAiAuditDto } from './note-ai-audit.dto';

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

  @IsOptional()
  @ValidateNested()
  @Type(() => NoteAiAuditDto)
  aiAudit?: NoteAiAuditDto;
}
