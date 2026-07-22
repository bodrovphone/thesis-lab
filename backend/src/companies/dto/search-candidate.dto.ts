import type { DataSource } from '../../generated/prisma/client';

export interface SearchCandidateDto {
  ticker: string;
  name: string;
  cik: string;
  exchange: string | null;
  source: DataSource;
}
