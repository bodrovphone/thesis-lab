import { Injectable } from '@nestjs/common';
import type { Note } from '../generated/prisma/client';
import type { NoteViewDto } from './dto/note-view.dto';

@Injectable()
export class NoteSerializer {
  toView(note: Note): NoteViewDto {
    return {
      id: note.id,
      companyId: note.companyId,
      body: note.body,
      moatPattern: note.moatPattern,
      businessModel: note.businessModel,
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
    };
  }
}
