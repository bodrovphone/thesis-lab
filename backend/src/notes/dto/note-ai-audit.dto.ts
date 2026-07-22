import { IsEnum, IsOptional, ValidateIf } from 'class-validator';
import { BusinessModel, MoatPattern } from '../../generated/prisma/client';

export class NoteAiAuditDto {
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsEnum(MoatPattern)
  suggestedMoatPattern?: MoatPattern | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsEnum(BusinessModel)
  suggestedBusinessModel?: BusinessModel | null;
}
