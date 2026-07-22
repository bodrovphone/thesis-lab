import type { BusinessModel, MoatPattern } from '../../generated/prisma/client';

export interface NoteViewDto {
  id: string;
  companyId: string;
  body: string;
  moatPattern: MoatPattern | null;
  businessModel: BusinessModel | null;
  createdAt: string;
  updatedAt: string;
}
