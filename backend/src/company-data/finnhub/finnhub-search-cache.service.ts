import { Injectable } from '@nestjs/common';
import type {
  AdapterResult,
  CompanySearchCandidate,
} from '../types/company-data.types';

const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_ENTRIES = 200;

interface CacheEntry {
  expiresAt: number;
  result: AdapterResult<CompanySearchCandidate[]>;
}

@Injectable()
export class FinnhubSearchCacheService {
  private readonly entries = new Map<string, CacheEntry>();
  private readonly inFlight = new Map<
    string,
    Promise<AdapterResult<CompanySearchCandidate[]>>
  >();

  clear(): void {
    this.entries.clear();
    this.inFlight.clear();
  }

  getOrFetch(
    query: string,
    limit: number,
    fetcher: () => Promise<AdapterResult<CompanySearchCandidate[]>>,
  ): Promise<AdapterResult<CompanySearchCandidate[]>> {
    const key = this.buildKey(query, limit);
    const now = Date.now();
    const cached = this.entries.get(key);

    if (cached && cached.expiresAt > now) {
      this.touch(key, cached);
      return Promise.resolve(cached.result);
    }

    if (cached) {
      this.entries.delete(key);
    }

    const pending = this.inFlight.get(key);
    if (pending) {
      return pending;
    }

    const promise = fetcher().then((result) => {
      this.inFlight.delete(key);
      if (result.status === 'ok') {
        this.set(key, {
          expiresAt: now + CACHE_TTL_MS,
          result,
        });
      }
      return result;
    });

    this.inFlight.set(key, promise);
    return promise;
  }

  private buildKey(query: string, limit: number): string {
    return `${query.trim().toLowerCase()}::${limit}`;
  }

  private touch(key: string, entry: CacheEntry): void {
    this.entries.delete(key);
    this.entries.set(key, entry);
  }

  private set(key: string, entry: CacheEntry): void {
    if (this.entries.size >= MAX_ENTRIES && !this.entries.has(key)) {
      const oldestKey = this.entries.keys().next().value;
      if (oldestKey !== undefined) {
        this.entries.delete(oldestKey);
      }
    }
    this.entries.set(key, entry);
  }
}
