import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { Prisma, DataSource } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface GetOrRefreshParams<T> {
  source: DataSource;
  cacheKey: string;
  ttlMs: number;
  refresh: () => Promise<T>;
}

/**
 * Generic PostgreSQL-backed cache over ExternalApiCacheEntry. Read-through
 * with TTL, upsert-on-refresh, stale-on-failure fallback, and in-flight
 * request coalescing so a burst of callers sharing one cache miss triggers
 * exactly one upstream fetch.
 */
@Injectable()
export class CompanyDataCacheService {
  private readonly logger = new Logger(CompanyDataCacheService.name);
  private readonly inFlight = new Map<string, Promise<unknown>>();

  constructor(private readonly prisma: PrismaService) {}

  async getOrRefresh<T>(params: GetOrRefreshParams<T>): Promise<T> {
    const { source, cacheKey, ttlMs, refresh } = params;

    const existing = await this.prisma.externalApiCacheEntry.findUnique({
      where: { source_cacheKey: { source, cacheKey } },
    });

    if (existing && existing.expiresAt.getTime() > Date.now()) {
      return existing.payload as T;
    }

    const inFlightKey = `${source}:${cacheKey}`;
    const pending = this.inFlight.get(inFlightKey);
    if (pending) {
      return pending as Promise<T>;
    }

    const refreshPromise = this.refreshAndStore({
      source,
      cacheKey,
      ttlMs,
      refresh,
      existingPayload: existing?.payload,
    });
    this.inFlight.set(inFlightKey, refreshPromise);

    try {
      return await refreshPromise;
    } finally {
      this.inFlight.delete(inFlightKey);
    }
  }

  private async refreshAndStore<T>(params: {
    source: DataSource;
    cacheKey: string;
    ttlMs: number;
    refresh: () => Promise<T>;
    existingPayload: unknown;
  }): Promise<T> {
    const { source, cacheKey, ttlMs, refresh, existingPayload } = params;

    try {
      const payload = await refresh();
      await this.prisma.externalApiCacheEntry.upsert({
        where: { source_cacheKey: { source, cacheKey } },
        create: {
          source,
          cacheKey,
          payload: payload as Prisma.InputJsonValue,
          expiresAt: new Date(Date.now() + ttlMs),
        },
        update: {
          payload: payload as Prisma.InputJsonValue,
          fetchedAt: new Date(),
          expiresAt: new Date(Date.now() + ttlMs),
        },
      });
      return payload;
    } catch (error) {
      if (existingPayload !== undefined) {
        this.logger.warn(
          `stale_cache_used source=${source} cacheKey=${cacheKey}`,
        );
        return existingPayload as T;
      }

      this.logger.warn(
        `cache_refresh_failed source=${source} cacheKey=${cacheKey} error=${
          error instanceof Error ? error.message : 'unknown'
        }`,
      );
      throw new ServiceUnavailableException(
        'SEC company directory is unavailable',
      );
    }
  }
}
