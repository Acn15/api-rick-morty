import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from '@upstash/redis';

type MemoryEntry = {
  value: unknown;
  expiresAt: number;
};

type CacheBackend = 'upstash-rest' | 'tcp' | 'memory';

type TcpStore = {
  get: <T>(key: string) => Promise<T | undefined>;
  set: (key: string, value: unknown, ttl?: number) => Promise<true>;
  on: (event: 'error', listener: (error: Error) => void) => unknown;
};

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly memory = new Map<string, MemoryEntry>();
  private readonly backend: CacheBackend;
  private readonly upstash: Redis | null = null;
  private tcp: TcpStore | null = null;
  private tcpInit: Promise<void> | null = null;

  constructor(private readonly configService: ConfigService) {
    const restUrl = this.configService.get<string>('KV_REST_API_URL');
    const restToken = this.configService.get<string>('KV_REST_API_TOKEN');

    if (restUrl && restToken) {
      this.upstash = new Redis({ url: restUrl, token: restToken });
      this.backend = 'upstash-rest';
      this.logger.log('Cache Redis: Upstash REST (KV_REST_API_*)');
      return;
    }

    if (this.resolveTcpRedisUrl()) {
      this.backend = 'tcp';
      this.logger.log(
        'Cache Redis: TCP adiado até o 1º uso (REDIS_URL/REDIS_HOST)',
      );
      return;
    }

    this.backend = 'memory';
    this.logger.warn('Cache Redis ausente — usando memória local');
  }

  getBackend(): CacheBackend {
    return this.backend;
  }

  async get<T>(key: string): Promise<T | undefined> {
    try {
      if (this.upstash) {
        const value = await this.upstash.get<T>(key);
        return value ?? undefined;
      }
      if (this.backend === 'tcp') {
        const store = await this.ensureTcp();
        if (!store) {
          return this.getFromMemory<T>(key);
        }
        return (await store.get<T>(key)) ?? undefined;
      }
      return this.getFromMemory<T>(key);
    } catch (error: unknown) {
      this.logger.warn(
        `Falha ao ler cache (${key}): ${this.stringifyError(error)}`,
      );
      return undefined;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    if (!this.isValidTtl(ttlSeconds)) {
      this.logger.warn(
        `TTL inválido (${String(ttlSeconds)}); valor não foi cacheado (${key})`,
      );
      return;
    }
    try {
      if (this.upstash) {
        await this.upstash.set(key, value, { ex: ttlSeconds });
        return;
      }
      if (this.backend === 'tcp') {
        const store = await this.ensureTcp();
        if (!store) {
          this.setInMemory(key, value, ttlSeconds);
          return;
        }
        await store.set(key, value, ttlSeconds * 1000);
        return;
      }
      this.setInMemory(key, value, ttlSeconds);
    } catch (error: unknown) {
      this.logger.warn(
        `Falha ao gravar cache (${key}): ${this.stringifyError(error)}`,
      );
    }
  }

  private async ensureTcp(): Promise<TcpStore | null> {
    if (this.tcp) {
      return this.tcp;
    }
    if (!this.tcpInit) {
      this.tcpInit = this.connectTcp();
    }
    await this.tcpInit;
    return this.tcp;
  }

  private async connectTcp(): Promise<void> {
    const redisUrl = this.resolveTcpRedisUrl();
    if (!redisUrl) {
      return;
    }
    try {
      // Lazy: não puxa @redis/client para o boot da Vercel quando REST existe
      const { createRedisKeyv } = await import('./create-redis-keyv.js');
      const store = createRedisKeyv(redisUrl) as unknown as TcpStore;
      store.on('error', (error: Error) => {
        this.logger.warn(`Redis TCP indisponível: ${error.message}`);
      });
      this.tcp = store;
      this.logger.log('Cache Redis TCP conectado');
    } catch (error: unknown) {
      this.logger.warn(
        `Falha Redis TCP; fallback memória. ${this.stringifyError(error)}`,
      );
      this.tcp = null;
    }
  }

  private resolveTcpRedisUrl(): string | undefined {
    const fromUrl =
      this.configService.get<string>('REDIS_URL') ??
      this.configService.get<string>('KV_URL');
    // Só aceita URL TCP. REST https:// não serve para @keyv/redis.
    if (fromUrl?.startsWith('redis://') || fromUrl?.startsWith('rediss://')) {
      return fromUrl;
    }
    const host = this.configService.get<string>('REDIS_HOST');
    const port = this.configService.get<string>('REDIS_PORT') ?? '6379';
    if (!host) {
      return undefined;
    }
    const password = this.configService.get<string>('REDIS_PASSWORD');
    const useTls = this.configService.get<string>('REDIS_TLS') === 'true';
    const scheme = useTls ? 'rediss' : 'redis';
    return password
      ? `${scheme}://:${encodeURIComponent(password)}@${host}:${port}`
      : `${scheme}://${host}:${port}`;
  }

  private getFromMemory<T>(key: string): T | undefined {
    const entry = this.memory.get(key);
    if (!entry) {
      return undefined;
    }
    if (Date.now() > entry.expiresAt) {
      this.memory.delete(key);
      return undefined;
    }
    return entry.value as T;
  }

  private setInMemory<T>(key: string, value: T, ttlSeconds: number): void {
    this.memory.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  private isValidTtl(ttlSeconds: number): boolean {
    return Number.isFinite(ttlSeconds) && ttlSeconds > 0;
  }

  private stringifyError(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
