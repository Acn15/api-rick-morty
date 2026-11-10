import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Test, TestingModule } from '@nestjs/testing';
import { CacheService } from './cache.service';
describe('CacheService', () => {
  let service: CacheService;
  let cacheManager: {
    get: jest.Mock;
    set: jest.Mock;
  };
  beforeEach(async () => {
    cacheManager = {
      get: jest.fn(),
      set: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheService,
        {
          provide: CACHE_MANAGER,
          useValue: cacheManager,
        },
      ],
    }).compile();
    service = module.get<CacheService>(CacheService);
  });
  it('should be defined', () => {
    expect(service).toBeDefined();
  });
  it('should inject CACHE_MANAGER token', () => {
    expect(cacheManager).toBeDefined();
  });
  it('should return cached value on get', async () => {
    cacheManager.get.mockResolvedValue({ id: 1 });
    await expect(
      service.get<{
        id: number;
      }>('key'),
    ).resolves.toEqual({
      id: 1,
    });
    expect(cacheManager.get).toHaveBeenCalledWith('key');
  });
  it('should unwrap Keyv { value, expires } envelope on get', async () => {
    cacheManager.get.mockResolvedValue({
      value: { id: 16, name: 'Get Schwifty' },
      expires: Date.now() + 60000,
    });
    await expect(
      service.get<{
        id: number;
        name: string;
      }>('episodes:16:characters'),
    ).resolves.toEqual({ id: 16, name: 'Get Schwifty' });
  });
  it('should return undefined when Redis read fails', async () => {
    cacheManager.get.mockRejectedValue(new Error('Redis down'));
    await expect(service.get('key')).resolves.toBeUndefined();
  });
  it('should convert ttl from seconds to milliseconds on set', async () => {
    cacheManager.set.mockResolvedValue(undefined);
    await service.set('key', { ok: true }, 3600);
    expect(cacheManager.set).toHaveBeenCalledWith(
      'key',
      { ok: true },
      3600 * 1000,
    );
  });
  it('should not call Redis when ttl is invalid', async () => {
    await service.set('key', { ok: true }, Number.NaN);
    await service.set('key', { ok: true }, 0);
    await service.set('key', { ok: true }, -10);
    expect(cacheManager.set).not.toHaveBeenCalled();
  });
  it('should swallow Redis write failures', async () => {
    cacheManager.set.mockRejectedValue(new Error('Redis down'));
    await expect(service.set('key', { ok: true }, 60)).resolves.toBeUndefined();
  });
});
