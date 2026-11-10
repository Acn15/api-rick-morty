import { CacheModule } from '@nestjs/cache-manager';
import { Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheService } from './cache.service';
import { createRedisKeyv } from './create-redis-keyv';

function buildRedisUrl(configService: ConfigService): string {
  const host = configService.getOrThrow<string>('REDIS_HOST');
  const port = configService.getOrThrow<string>('REDIS_PORT');
  const password = configService.get<string>('REDIS_PASSWORD');
  const useTls = configService.get<string>('REDIS_TLS') === 'true';
  const scheme = useTls ? 'rediss' : 'redis';
  return password
    ? `${scheme}://:${encodeURIComponent(password)}@${host}:${port}`
    : `${scheme}://${host}:${port}`;
}

@Module({
  imports: [
    CacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const logger = new Logger('RedisCacheModule');
        // Vercel/Upstash inject REDIS_URL or KV_URL (rediss://...). Local Docker uses HOST/PORT.
        const redisUrl =
          configService.get<string>('REDIS_URL') ??
          configService.get<string>('KV_URL') ??
          buildRedisUrl(configService);
        const redisStore = createRedisKeyv(redisUrl);
        redisStore.on('error', (error: Error) => {
          logger.warn(`Redis indisponível: ${error.message}`);
        });
        return {
          stores: [redisStore],
        };
      },
    }),
  ],
  providers: [CacheService],
  exports: [CacheService],
})
export class RedisCacheModule {}
