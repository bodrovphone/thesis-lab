import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { CreateNoteDto } from './dto/create-note.dto';
import type { NoteViewDto } from './dto/note-view.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { NotesService } from './notes.service';

@Controller('companies/:companyId/notes')
export class CompanyNotesController {
  constructor(private readonly notesService: NotesService) {}

  @Post()
  @HttpCode(201)
  create(
    @Param('companyId') companyId: string,
    @Body() dto: CreateNoteDto,
  ): Promise<NoteViewDto> {
    return this.notesService.create(companyId, dto);
  }

  @Get()
  async findAll(
    @Param('companyId') companyId: string,
  ): Promise<{ items: NoteViewDto[] }> {
    const items = await this.notesService.findByCompany(companyId);
    return { items };
  }
}

@Controller('notes')
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateNoteDto,
  ): Promise<NoteViewDto> {
    return this.notesService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string): Promise<void> {
    await this.notesService.remove(id);
  }
}
