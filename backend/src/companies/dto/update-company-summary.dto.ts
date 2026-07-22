import { IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateCompanySummaryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(8000)
  currentThinkingSummary!: string;
}
