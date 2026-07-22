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
    fetchProfiles: jest.fn(),
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
  sources: ['SEC_EDGAR', 'FINNHUB'] as const,
};

describe('CompaniesService', () => {
  it('creates a COMPLETE company when both profiles succeed', async () => {
    const prisma = makePrisma();
    const aggregator = makeAggregator();
    const serializer = makeSerializer();
    prisma.company.findUnique.mockResolvedValue(null);
    aggregator.resolveCandidate.mockResolvedValue(candidate);
    aggregator.fetchProfiles.mockResolvedValue([
      {
        source: 'SEC_EDGAR',
        status: 'ok',
        data: {
          ticker: 'AAPL',
          name: 'Apple Inc.',
          cik: '0000320193',
          exchange: 'Nasdaq',
          industry: 'Electronic Computers',
          country: null,
          marketCapUsd: null,
          website: null,
          logoUrl: null,
        },
      },
      {
        source: 'FINNHUB',
        status: 'ok',
        data: {
          ticker: 'AAPL',
          name: 'Apple Inc',
          cik: null,
          exchange: 'NASDAQ',
          industry: 'Technology',
          country: 'US',
          marketCapUsd: 3_000_000_000_000n,
          website: 'https://apple.com',
          logoUrl: 'https://static2.finnhub.io/logo.png',
        },
      },
    ]);
    prisma.company.create.mockResolvedValue({ id: 'c1' });

    const service = new CompaniesService(
      prisma as never,
      aggregator as never,
      serializer,
    );
    const result = await service.create('aapl');

    expect(prisma.company.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        ticker: 'AAPL',
        name: 'Apple Inc',
        cik: '0000320193',
        country: 'US',
        website: 'https://apple.com',
        enrichmentStatus: EnrichmentStatus.COMPLETE,
        sourcesUsed: [DataSource.SEC_EDGAR, DataSource.FINNHUB],
        lastEnrichedAt: expect.any(Date),
      }),
    });
    expect(result).toEqual({ id: 'c1', __view: true });
  });

  it('creates a PARTIAL company when only SEC succeeds', async () => {
    const prisma = makePrisma();
    const aggregator = makeAggregator();
    const serializer = makeSerializer();
    prisma.company.findUnique.mockResolvedValue(null);
    aggregator.resolveCandidate.mockResolvedValue(candidate);
    aggregator.fetchProfiles.mockResolvedValue([
      {
        source: 'SEC_EDGAR',
        status: 'ok',
        data: {
          ticker: 'AAPL',
          name: 'Apple Inc.',
          cik: '0000320193',
          exchange: 'Nasdaq',
          industry: 'Electronic Computers',
          country: null,
          marketCapUsd: null,
          website: null,
          logoUrl: null,
        },
      },
      {
        source: 'FINNHUB',
        status: 'timeout',
        message: 'Finnhub request timed out',
      },
    ]);
    prisma.company.create.mockResolvedValue({ id: 'c1' });

    const service = new CompaniesService(
      prisma as never,
      aggregator as never,
      serializer,
    );
    await service.create('AAPL');

    expect(prisma.company.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: 'Apple Inc.',
        enrichmentStatus: EnrichmentStatus.PARTIAL,
        sourcesUsed: [DataSource.SEC_EDGAR, DataSource.FINNHUB],
      }),
    });
  });

  it('creates a FAILED company when both profiles fail', async () => {
    const prisma = makePrisma();
    const aggregator = makeAggregator();
    const serializer = makeSerializer();
    prisma.company.findUnique.mockResolvedValue(null);
    aggregator.resolveCandidate.mockResolvedValue(candidate);
    aggregator.fetchProfiles.mockResolvedValue([
      {
        source: 'SEC_EDGAR',
        status: 'timeout',
        message: 'SEC request timed out',
      },
      {
        source: 'FINNHUB',
        status: 'error',
        message: 'Finnhub request failed',
      },
    ]);
    prisma.company.create.mockResolvedValue({ id: 'c1' });

    const service = new CompaniesService(
      prisma as never,
      aggregator as never,
      serializer,
    );
    await service.create('AAPL');

    expect(prisma.company.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: 'Apple Inc.',
        enrichmentStatus: EnrichmentStatus.FAILED,
        lastEnrichedAt: null,
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

  it('rejects with NotFoundException when the ticker is not found', async () => {
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
    expect(aggregator.fetchProfiles).not.toHaveBeenCalled();
  });

  it('converts a Prisma unique-constraint race into ConflictException', async () => {
    const prisma = makePrisma();
    const aggregator = makeAggregator();
    const serializer = makeSerializer();
    prisma.company.findUnique.mockResolvedValue(null);
    aggregator.resolveCandidate.mockResolvedValue(candidate);
    aggregator.fetchProfiles.mockResolvedValue([
      {
        source: 'SEC_EDGAR',
        status: 'ok',
        data: {
          ticker: 'AAPL',
          name: 'Apple Inc.',
          cik: '0000320193',
          exchange: 'Nasdaq',
          industry: null,
          country: null,
          marketCapUsd: null,
          website: null,
          logoUrl: null,
        },
      },
      {
        source: 'FINNHUB',
        status: 'disabled',
        message: 'Finnhub adapter is disabled',
      },
    ]);
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
});
