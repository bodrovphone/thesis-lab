import { ServiceUnavailableException } from '@nestjs/common';
import { DataSource } from '../../generated/prisma/client';
import { CompanyDataCacheService } from './company-data-cache.service';

function makePrisma() {
  return {
    externalApiCacheEntry: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
  };
}

describe('CompanyDataCacheService', () => {
  it('returns the cached payload without refreshing when still fresh', async () => {
    const prisma = makePrisma();
    prisma.externalApiCacheEntry.findUnique.mockResolvedValue({
      payload: { hello: 'cached' },
      expiresAt: new Date(Date.now() + 60_000),
    });
    const refresh = jest.fn();
    const service = new CompanyDataCacheService(prisma as never);

    const result = await service.getOrRefresh({
      source: DataSource.SEC_EDGAR,
      cacheKey: 'k',
      ttlMs: 1000,
      refresh,
    });

    expect(result).toEqual({ hello: 'cached' });
    expect(refresh).not.toHaveBeenCalled();
    expect(prisma.externalApiCacheEntry.upsert).not.toHaveBeenCalled();
  });

  it('refreshes and upserts when the cache row has expired', async () => {
    const prisma = makePrisma();
    prisma.externalApiCacheEntry.findUnique.mockResolvedValue({
      payload: { hello: 'stale' },
      expiresAt: new Date(Date.now() - 1000),
    });
    prisma.externalApiCacheEntry.upsert.mockResolvedValue(undefined);
    const refresh = jest.fn().mockResolvedValue({ hello: 'fresh' });
    const service = new CompanyDataCacheService(prisma as never);

    const result = await service.getOrRefresh({
      source: DataSource.SEC_EDGAR,
      cacheKey: 'k',
      ttlMs: 1000,
      refresh,
    });

    expect(result).toEqual({ hello: 'fresh' });
    expect(prisma.externalApiCacheEntry.upsert).toHaveBeenCalledTimes(1);
    const call = prisma.externalApiCacheEntry.upsert.mock.calls[0][0];
    expect(call.where).toEqual({
      source_cacheKey: { source: DataSource.SEC_EDGAR, cacheKey: 'k' },
    });
  });

  it('refreshes and stores a payload when no cache row exists yet', async () => {
    const prisma = makePrisma();
    prisma.externalApiCacheEntry.findUnique.mockResolvedValue(null);
    prisma.externalApiCacheEntry.upsert.mockResolvedValue(undefined);
    const refresh = jest.fn().mockResolvedValue({ hello: 'first' });
    const service = new CompanyDataCacheService(prisma as never);

    const result = await service.getOrRefresh({
      source: DataSource.SEC_EDGAR,
      cacheKey: 'k',
      ttlMs: 1000,
      refresh,
    });

    expect(result).toEqual({ hello: 'first' });
    expect(prisma.externalApiCacheEntry.upsert).toHaveBeenCalledTimes(1);
  });

  it('falls back to the stale payload when refresh fails and a cache row exists', async () => {
    const prisma = makePrisma();
    prisma.externalApiCacheEntry.findUnique.mockResolvedValue({
      payload: { hello: 'stale' },
      expiresAt: new Date(Date.now() - 1000),
    });
    const refresh = jest.fn().mockRejectedValue(new Error('boom'));
    const service = new CompanyDataCacheService(prisma as never);

    const result = await service.getOrRefresh({
      source: DataSource.SEC_EDGAR,
      cacheKey: 'k',
      ttlMs: 1000,
      refresh,
    });

    expect(result).toEqual({ hello: 'stale' });
    expect(prisma.externalApiCacheEntry.upsert).not.toHaveBeenCalled();
  });

  it('throws ServiceUnavailableException when refresh fails with no usable cache', async () => {
    const prisma = makePrisma();
    prisma.externalApiCacheEntry.findUnique.mockResolvedValue(null);
    const refresh = jest.fn().mockRejectedValue(new Error('boom'));
    const service = new CompanyDataCacheService(prisma as never);

    await expect(
      service.getOrRefresh({
        source: DataSource.SEC_EDGAR,
        cacheKey: 'k',
        ttlMs: 1000,
        refresh,
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('coalesces concurrent cache misses into a single refresh call', async () => {
    const prisma = makePrisma();
    prisma.externalApiCacheEntry.findUnique.mockResolvedValue(null);
    prisma.externalApiCacheEntry.upsert.mockResolvedValue(undefined);
    let resolveRefresh: (value: { hello: string }) => void = () => undefined;
    const deferred = new Promise<{ hello: string }>((resolve) => {
      resolveRefresh = resolve;
    });
    const refresh = jest.fn().mockReturnValue(deferred);
    const service = new CompanyDataCacheService(prisma as never);

    const p1 = service.getOrRefresh({
      source: DataSource.SEC_EDGAR,
      cacheKey: 'k',
      ttlMs: 1000,
      refresh,
    });
    const p2 = service.getOrRefresh({
      source: DataSource.SEC_EDGAR,
      cacheKey: 'k',
      ttlMs: 1000,
      refresh,
    });

    resolveRefresh({ hello: 'once' });
    const [r1, r2] = await Promise.all([p1, p2]);

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(r1).toEqual({ hello: 'once' });
    expect(r2).toEqual({ hello: 'once' });
  });
});
