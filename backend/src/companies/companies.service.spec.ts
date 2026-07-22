import { ConflictException, NotFoundException } from '@nestjs/common';
import {
  DataSource,
  EnrichmentStatus,
  Prisma,
} from '../generated/prisma/client';
import { CompaniesService } from './companies.service';

function makePrisma() {
  return {
    company: {
      findUnique: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
    },
  };
}

function makeAggregator() {
  return {
    searchCandidates: jest.fn(),
    resolveCandidate: jest.fn(),
    fetchProfile: jest.fn(),
  };
}

function makeSerializer() {
  return {
    toView: jest.fn((company: Record<string, unknown>) => ({
      ...company,
      __view: true,
    })),
  };
}

const candidate = {
  ticker: 'AAPL',
  name: 'Apple Inc.',
  cik: '0000320193',
  exchange: 'Nasdaq',
  source: 'SEC_EDGAR' as const,
};

describe('CompaniesService', () => {
  it('creates a COMPLETE company when the SEC profile fetch succeeds', async () => {
    const prisma = makePrisma();
    const aggregator = makeAggregator();
    const serializer = makeSerializer();
    prisma.company.findUnique.mockResolvedValue(null);
    aggregator.resolveCandidate.mockResolvedValue(candidate);
    aggregator.fetchProfile.mockResolvedValue({
      source: 'SEC_EDGAR',
      status: 'ok',
      data: {
        ticker: 'AAPL',
        name: 'Apple Inc.',
        cik: '0000320193',
        exchange: 'Nasdaq',
        industry: 'Electronic Computers',
      },
    });
    prisma.company.create.mockResolvedValue({ id: 'c1' });

    const service = new CompaniesService(
      prisma as never,
      aggregator as never,
      serializer,
    );
    const result = await service.create('aapl');

    expect(prisma.company.findUnique).toHaveBeenCalledWith({
      where: { ticker: 'AAPL' },
    });
    expect(aggregator.resolveCandidate).toHaveBeenCalledWith('AAPL');
    expect(prisma.company.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        ticker: 'AAPL',
        name: 'Apple Inc.',
        industry: 'Electronic Computers',
        enrichmentStatus: EnrichmentStatus.COMPLETE,
        sourcesUsed: [DataSource.SEC_EDGAR],
      }),
    });
    expect(result).toEqual({ id: 'c1', __view: true });
  });

  it('creates a PARTIAL company when the SEC profile fetch fails', async () => {
    const prisma = makePrisma();
    const aggregator = makeAggregator();
    const serializer = makeSerializer();
    prisma.company.findUnique.mockResolvedValue(null);
    aggregator.resolveCandidate.mockResolvedValue(candidate);
    aggregator.fetchProfile.mockResolvedValue({
      source: 'SEC_EDGAR',
      status: 'timeout',
      message: 'SEC request timed out',
    });
    prisma.company.create.mockResolvedValue({ id: 'c1' });

    const service = new CompaniesService(
      prisma as never,
      aggregator as never,
      serializer,
    );
    await service.create('AAPL');

    expect(prisma.company.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        ticker: 'AAPL',
        name: 'Apple Inc.',
        enrichmentStatus: EnrichmentStatus.PARTIAL,
        lastEnrichedAt: null,
        sourcesUsed: [DataSource.SEC_EDGAR],
      }),
    });
  });

  it('rejects with ConflictException when the ticker is already tracked', async () => {
    const prisma = makePrisma();
    const aggregator = makeAggregator();
    const serializer = makeSerializer();
    prisma.company.findUnique.mockResolvedValue({ id: 'existing' });

    const service = new CompaniesService(
      prisma as never,
      aggregator as never,
      serializer,
    );

    await expect(service.create('AAPL')).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(aggregator.resolveCandidate).not.toHaveBeenCalled();
  });

  it('rejects with NotFoundException when the ticker is not in the SEC directory', async () => {
    const prisma = makePrisma();
    const aggregator = makeAggregator();
    const serializer = makeSerializer();
    prisma.company.findUnique.mockResolvedValue(null);
    aggregator.resolveCandidate.mockResolvedValue(null);

    const service = new CompaniesService(
      prisma as never,
      aggregator as never,
      serializer,
    );

    await expect(service.create('ZZZZZ')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(aggregator.fetchProfile).not.toHaveBeenCalled();
  });

  it('converts a Prisma unique-constraint race into ConflictException', async () => {
    const prisma = makePrisma();
    const aggregator = makeAggregator();
    const serializer = makeSerializer();
    prisma.company.findUnique.mockResolvedValue(null);
    aggregator.resolveCandidate.mockResolvedValue(candidate);
    aggregator.fetchProfile.mockResolvedValue({
      source: 'SEC_EDGAR',
      status: 'ok',
      data: {
        ticker: 'AAPL',
        name: 'Apple Inc.',
        cik: '0000320193',
        exchange: 'Nasdaq',
        industry: null,
      },
    });
    prisma.company.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '7.9.0',
      }),
    );

    const service = new CompaniesService(
      prisma as never,
      aggregator as never,
      serializer,
    );

    await expect(service.create('AAPL')).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('rethrows unrelated persistence errors', async () => {
    const prisma = makePrisma();
    const aggregator = makeAggregator();
    const serializer = makeSerializer();
    prisma.company.findUnique.mockResolvedValue(null);
    aggregator.resolveCandidate.mockResolvedValue(candidate);
    aggregator.fetchProfile.mockResolvedValue({
      source: 'SEC_EDGAR',
      status: 'ok',
      data: {
        ticker: 'AAPL',
        name: 'Apple Inc.',
        cik: '0000320193',
        exchange: 'Nasdaq',
        industry: null,
      },
    });
    prisma.company.create.mockRejectedValue(new Error('db is down'));

    const service = new CompaniesService(
      prisma as never,
      aggregator as never,
      serializer,
    );

    await expect(service.create('AAPL')).rejects.toThrow('db is down');
  });

  it('delegates external search to the aggregator', async () => {
    const prisma = makePrisma();
    const aggregator = makeAggregator();
    const serializer = makeSerializer();
    aggregator.searchCandidates.mockResolvedValue([candidate]);

    const service = new CompaniesService(
      prisma as never,
      aggregator as never,
      serializer,
    );

    await expect(service.searchExternal('apple', 10)).resolves.toEqual([
      candidate,
    ]);
    expect(aggregator.searchCandidates).toHaveBeenCalledWith('apple', 10);
  });

  it('lists companies ordered by updatedAt desc, then ticker asc', async () => {
    const prisma = makePrisma();
    const aggregator = makeAggregator();
    const serializer = makeSerializer();
    prisma.company.findMany.mockResolvedValue([{ id: 'c1' }, { id: 'c2' }]);

    const service = new CompaniesService(
      prisma as never,
      aggregator as never,
      serializer,
    );
    await service.findAll();

    expect(prisma.company.findMany).toHaveBeenCalledWith({
      orderBy: [{ updatedAt: 'desc' }, { ticker: 'asc' }],
    });
  });

  it('returns null from findOne when the company does not exist', async () => {
    const prisma = makePrisma();
    const aggregator = makeAggregator();
    const serializer = makeSerializer();
    prisma.company.findUnique.mockResolvedValue(null);

    const service = new CompaniesService(
      prisma as never,
      aggregator as never,
      serializer,
    );

    await expect(service.findOne('missing-id')).resolves.toBeNull();
  });
});
