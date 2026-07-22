import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NOTE_BODY_MAX_LENGTH } from './constants';
import type { CreateNoteDto } from './dto/create-note.dto';
import type { NoteViewDto } from './dto/note-view.dto';
import type { UpdateNoteDto } from './dto/update-note.dto';
import { resolveNoteAiAudit } from './note-ai-audit';
import { NoteSerializer } from './note.serializer';

@Injectable()
export class NotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly serializer: NoteSerializer,
  ) {}

  private normalizeBody(body: string): string {
    const trimmed = body.trim();
    if (!trimmed) {
      throw new BadRequestException('Note body is required');
    }
    if (trimmed.length > NOTE_BODY_MAX_LENGTH) {
      throw new BadRequestException(
        `Note body must be at most ${NOTE_BODY_MAX_LENGTH} characters`,
      );
    }
    return trimmed;
  }

  private async assertCompanyExists(companyId: string): Promise<void> {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true },
    });
    if (!company) {
      throw new NotFoundException('Company not found');
    }
  }

  async create(companyId: string, dto: CreateNoteDto): Promise<NoteViewDto> {
    await this.assertCompanyExists(companyId);

    const moatPattern = dto.moatPattern ?? null;
    const businessModel = dto.businessModel ?? null;
    const aiFields = resolveNoteAiAudit(moatPattern, businessModel, dto.aiAudit);

    const note = await this.prisma.note.create({
      data: {
        companyId,
        body: this.normalizeBody(dto.body),
        moatPattern,
        businessModel,
        ...aiFields,
      },
    });

    return this.serializer.toView(note);
  }

  async findByCompany(companyId: string): Promise<NoteViewDto[]> {
    await this.assertCompanyExists(companyId);

    const notes = await this.prisma.note.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
    });

    return notes.map((note) => this.serializer.toView(note));
  }

  async update(id: string, dto: UpdateNoteDto): Promise<NoteViewDto> {
    const existing = await this.prisma.note.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Note not found');
    }

    const data: {
      body?: string;
      moatPattern?: typeof existing.moatPattern;
      businessModel?: typeof existing.businessModel;
      aiSuggestedMoatPattern?: typeof existing.aiSuggestedMoatPattern;
      aiSuggestedBusinessModel?: typeof existing.aiSuggestedBusinessModel;
      tagEditedByUser?: boolean | null;
    } = {};

    if (dto.body !== undefined) {
      data.body = this.normalizeBody(dto.body);
    }
    if (dto.moatPattern !== undefined) {
      data.moatPattern = dto.moatPattern;
    }
    if (dto.businessModel !== undefined) {
      data.businessModel = dto.businessModel;
    }

    if (dto.aiAudit !== undefined) {
      const savedMoatPattern =
        dto.moatPattern !== undefined ? dto.moatPattern : existing.moatPattern;
      const savedBusinessModel =
        dto.businessModel !== undefined
          ? dto.businessModel
          : existing.businessModel;
      Object.assign(
        data,
        resolveNoteAiAudit(savedMoatPattern, savedBusinessModel, dto.aiAudit),
      );
    }

    const note = await this.prisma.note.update({
      where: { id },
      data,
    });

    return this.serializer.toView(note);
  }

  async remove(id: string): Promise<void> {
    try {
      await this.prisma.note.delete({ where: { id } });
    } catch {
      throw new NotFoundException('Note not found');
    }
  }
}
