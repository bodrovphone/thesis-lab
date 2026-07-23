import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { NotesService } from './notes.service';

function makePrisma() {
  return {
    company: {
      findUnique: jest.fn(),
    },
    note: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };
}

function makeSerializer() {
  return {
    toView: jest.fn((note: Record<string, unknown>) => ({
      ...note,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      __view: true,
    })),
  };
}

describe('NotesService', () => {
  it('creates a note with trimmed body and optional tags', async () => {
    const prisma = makePrisma();
    const serializer = makeSerializer();
    prisma.company.findUnique.mockResolvedValue({ id: 'c1' });
    prisma.note.create.mockResolvedValue({
      id: 'n1',
      companyId: 'c1',
      body: 'Interesting moat',
      moatPattern: 'NETWORK_EFFECTS',
      businessModel: null,
    });

    const service = new NotesService(prisma as never, serializer);
    const result = await service.create('c1', {
      body: '  Interesting moat  ',
      moatPattern: 'NETWORK_EFFECTS',
    });

    expect(prisma.note.create).toHaveBeenCalledWith({
      data: {
        companyId: 'c1',
        body: 'Interesting moat',
        moatPattern: 'NETWORK_EFFECTS',
        businessModel: null,
        aiSuggestedMoatPattern: null,
        aiSuggestedBusinessModel: null,
        tagEditedByUser: null,
      },
    });
    expect(result.__view).toBe(true);
  });

  it('rejects empty note bodies', async () => {
    const prisma = makePrisma();
    const serializer = makeSerializer();
    prisma.company.findUnique.mockResolvedValue({ id: 'c1' });
    const service = new NotesService(prisma as never, serializer);

    await expect(service.create('c1', { body: '   ' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('throws when creating a note for a missing company', async () => {
    const prisma = makePrisma();
    const serializer = makeSerializer();
    prisma.company.findUnique.mockResolvedValue(null);
    const service = new NotesService(prisma as never, serializer);

    await expect(
      service.create('missing', { body: 'Hello' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('updates note body and clears optional tags', async () => {
    const prisma = makePrisma();
    const serializer = makeSerializer();
    prisma.note.findUnique.mockResolvedValue({
      id: 'n1',
      companyId: 'c1',
      body: 'Old',
      moatPattern: 'BRAND',
      businessModel: 'B2B_SOFTWARE',
    });
    prisma.note.update.mockResolvedValue({
      id: 'n1',
      companyId: 'c1',
      body: 'New body',
      moatPattern: null,
      businessModel: null,
    });

    const service = new NotesService(prisma as never, serializer);
    await service.update('n1', {
      body: ' New body ',
      moatPattern: null,
      businessModel: null,
    });

    expect(prisma.note.update).toHaveBeenCalledWith({
      where: { id: 'n1' },
      data: {
        body: 'New body',
        moatPattern: null,
        businessModel: null,
      },
    });
  });

  it('persists AI audit metadata when a suggestion accompanies the save', async () => {
    const prisma = makePrisma();
    const serializer = makeSerializer();
    prisma.company.findUnique.mockResolvedValue({ id: 'c1' });
    prisma.note.create.mockResolvedValue({ id: 'n1' });

    const service = new NotesService(prisma as never, serializer);
    await service.create('c1', {
      body: 'Platform effects are strengthening',
      moatPattern: 'NETWORK_EFFECTS',
      businessModel: 'MARKETPLACES_AND_PLATFORMS',
      aiAudit: {
        suggestedMoatPattern: 'NETWORK_EFFECTS',
        suggestedBusinessModel: 'B2B_SOFTWARE',
      },
    });

    expect(prisma.note.create).toHaveBeenCalledWith({
      data: {
        companyId: 'c1',
        body: 'Platform effects are strengthening',
        moatPattern: 'NETWORK_EFFECTS',
        businessModel: 'MARKETPLACES_AND_PLATFORMS',
        aiSuggestedMoatPattern: 'NETWORK_EFFECTS',
        aiSuggestedBusinessModel: 'B2B_SOFTWARE',
        tagEditedByUser: true,
      },
    });
  });

  it('updates AI audit metadata when provided on edit', async () => {
    const prisma = makePrisma();
    const serializer = makeSerializer();
    prisma.note.findUnique.mockResolvedValue({
      id: 'n1',
      companyId: 'c1',
      body: 'Old',
      moatPattern: 'BRAND',
      businessModel: null,
    });
    prisma.note.update.mockResolvedValue({ id: 'n1' });

    const service = new NotesService(prisma as never, serializer);
    await service.update('n1', {
      moatPattern: 'BRAND',
      aiAudit: {
        suggestedMoatPattern: 'NETWORK_EFFECTS',
        suggestedBusinessModel: null,
      },
    });

    expect(prisma.note.update).toHaveBeenCalledWith({
      where: { id: 'n1' },
      data: {
        moatPattern: 'BRAND',
        aiSuggestedMoatPattern: 'NETWORK_EFFECTS',
        aiSuggestedBusinessModel: null,
        tagEditedByUser: true,
      },
    });
  });

  it('throws when deleting a missing note', async () => {
    const prisma = makePrisma();
    const serializer = makeSerializer();
    prisma.note.delete.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Record to delete not found', {
        code: 'P2025',
        clientVersion: '7.9.0',
      }),
    );
    const service = new NotesService(prisma as never, serializer);

    await expect(service.remove('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('rethrows unexpected errors when deleting a note', async () => {
    const prisma = makePrisma();
    const serializer = makeSerializer();
    const unexpected = new Error('db offline');
    prisma.note.delete.mockRejectedValue(unexpected);
    const service = new NotesService(prisma as never, serializer);

    await expect(service.remove('n1')).rejects.toBe(unexpected);
  });
});
