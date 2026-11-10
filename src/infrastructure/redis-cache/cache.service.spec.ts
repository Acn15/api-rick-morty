import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { CacheService } from './cache.service';

describe('CacheService', () => {
  let service: CacheService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheService,
        {
          provide: ConfigService,
          useValue: {
            get: () => undefined,
          },
        },
      ],
    }).compile();
    service = module.get<CacheService>(CacheService);
  });

  it('should fall back to memory when redis env is absent', () => {
    expect(service.getBackend()).toBe('memory');
  });

  it('should round-trip values in memory', async () => {
    await service.set('key', { id: 1 }, 60);
    await expect(service.get<{ id: number }>('key')).resolves.toEqual({
      id: 1,
    });
  });

  it('should skip invalid ttl', async () => {
    await service.set('key', { ok: true }, 0);
    await expect(service.get('key')).resolves.toBeUndefined();
  });
});

describe('CacheService upstash-rest', () => {
  it('should select upstash-rest when KV REST env is set', async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheService,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => {
              if (key === 'KV_REST_API_URL') {
                return 'https://example.upstash.io';
              }
              if (key === 'KV_REST_API_TOKEN') {
                return 'token';
              }
              return undefined;
            },
          },
        },
      ],
    }).compile();
    const service = module.get<CacheService>(CacheService);
    expect(service.getBackend()).toBe('upstash-rest');
  });
});
