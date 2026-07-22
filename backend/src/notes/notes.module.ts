import { Module } from '@nestjs/common';
import { CompanyNotesController, NotesController } from './notes.controller';
import { NoteSerializer } from './note.serializer';
import { NotesService } from './notes.service';

@Module({
  controllers: [CompanyNotesController, NotesController],
  providers: [NotesService, NoteSerializer],
  exports: [NotesService, NoteSerializer],
})
export class NotesModule {}
