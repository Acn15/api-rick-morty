// TEMP Vercel: cache em memória sem @nestjs/cache-manager / Redis
import { Injectable, Logger } from '@nestjs/common';
// import { CACHE_MANAGER } from '@nestjs/cache-manager';
// import { Inject, Injectable, Logger } from '@nestjs/common';
// import type { Cache } from 'cache-manager';
// type KeyvEnvelope<T> = {
//   value: T;
//   expires?: number;
// };

type MemoryEntry = {
  value: unknown;
  expiresAt: number;
};

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly store = new Map<string, MemoryEntry>();
  // constructor(
  //   @Inject(CACHE_MANAGER)
  //   private readonly cacheManager: Cache,
  // ) {}

  get<T>(key: string): Promise<T | undefined> {
    try {
      const entry = this.store.get(key);
      if (!entry) {
        return Promise.resolve(undefined);
      }
      if (Date.now() > entry.expiresAt) {
        this.store.delete(key);
        return Promise.resolve(undefined);
      }
      return Promise.resolve(entry.value as T);
      // const cached = await this.cacheManager.get<T | KeyvEnvelope<T>>(key);
      // if (cached === undefined) {
      //   return undefined;
      // }
      // return this.unwrap<T>(cached);
    } catch (error: unknown) {
      this.logger.warn(
        `Falha ao ler cache (${key}): ${this.stringifyError(error)}`,
      );
      return Promise.resolve(undefined);
    }
  }

  set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    if (!this.isValidTtl(ttlSeconds)) {
      this.logger.warn(
        `TTL inválido (${String(ttlSeconds)}); valor não foi cacheado (${key})`,
      );
      return Promise.resolve();
    }
    try {
      this.store.set(key, {
        value,
        expiresAt: Date.now() + ttlSeconds * 1000,
      });
      // await this.cacheManager.set(key, value, ttlSeconds * 1000);
    } catch (error: unknown) {
      this.logger.warn(
        `Falha ao gravar cache (${key}): ${this.stringifyError(error)}`,
      );
    }
    return Promise.resolve();
  }

  // private unwrap<T>(cached: T | KeyvEnvelope<T>): T {
  //   if (!this.isKeyvEnvelope<T>(cached)) {
  //     return cached;
  //   }
  //   return cached.value;
  // }
  // private isKeyvEnvelope<T>(cached: unknown): cached is KeyvEnvelope<T> {
  //   if (
  //     cached === null ||
  //     typeof cached !== 'object' ||
  //     Array.isArray(cached)
  //   ) {
  //     return false;
  //   }
  //   if (!('value' in cached)) {
  //     return false;
  //   }
  //   return Object.keys(cached).every(
  //     (key) => key === 'value' || key === 'expires',
  //   );
  // }

  private isValidTtl(ttlSeconds: number): boolean {
    return Number.isFinite(ttlSeconds) && ttlSeconds > 0;
  }

  private stringifyError(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
