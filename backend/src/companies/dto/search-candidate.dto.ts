import type { DataSource } from '../../generated/prisma/client';

export interface SearchCandidateDto {
  ticker: string;
  name: string;
  cik: string | null;
  exchange: string | null;
  sources: DataSource[];
}
