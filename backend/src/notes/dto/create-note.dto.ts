import { Type } from 'class-transformer';
import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { BusinessModel, MoatPattern } from '../../generated/prisma/client';
import { NOTE_BODY_MAX_LENGTH } from '../constants';
import { NoteAiAuditDto } from './note-ai-audit.dto';

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

  @IsOptional()
  @ValidateNested()
  @Type(() => NoteAiAuditDto)
  aiAudit?: NoteAiAuditDto;
}
