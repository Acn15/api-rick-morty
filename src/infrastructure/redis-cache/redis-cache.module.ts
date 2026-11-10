import { CacheModule } from '@nestjs/cache-manager';
import { Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheService } from './cache.service';
import { createRedisKeyv } from './create-redis-keyv';
@Module({
  imports: [
    CacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const logger = new Logger('RedisCacheModule');
        const host = configService.getOrThrow<string>('REDIS_HOST');
        const port = configService.getOrThrow<string>('REDIS_PORT');
        const password = configService.get<string>('REDIS_PASSWORD');
        const redisUrl = password
          ? `redis://:${encodeURIComponent(password)}@${host}:${port}`
          : `redis://${host}:${port}`;
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
