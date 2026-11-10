import { CacheModule } from '@nestjs/cache-manager';
import { Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheService } from './cache.service';
// import { createRedisKeyv } from './create-redis-keyv';

// function buildRedisUrl(configService: ConfigService): string | undefined {
//   const host = configService.get<string>('REDIS_HOST');
//   const port = configService.get<string>('REDIS_PORT') ?? '6379';
//   if (!host) {
//     return undefined;
//   }
//   const password = configService.get<string>('REDIS_PASSWORD');
//   const useTls = configService.get<string>('REDIS_TLS') === 'true';
//   const scheme = useTls ? 'rediss' : 'redis';
//   return password
//     ? `${scheme}://:${encodeURIComponent(password)}@${host}:${port}`
//     : `${scheme}://${host}:${port}`;
// }

@Module({
  imports: [
    CacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (_configService: ConfigService) => {
        const logger = new Logger('RedisCacheModule');
        // TEMP (Vercel): forçar memória para isolar crash do Upstash/rediss
        logger.warn('Redis desligado temporariamente — cache em memória.');
        return { stores: [] };
        // // Vercel/Upstash inject REDIS_URL or KV_URL (rediss://...). Local Docker uses HOST/PORT.
        // const redisUrl =
        //   _configService.get<string>('REDIS_URL') ??
        //   _configService.get<string>('KV_URL') ??
        //   buildRedisUrl(_configService);
        // if (!redisUrl) {
        //   logger.warn(
        //     'Redis não configurado (REDIS_URL/KV_URL/REDIS_HOST). Cache em memória.',
        //   );
        //   return { stores: [] };
        // }
        // try {
        //   const redisStore = createRedisKeyv(redisUrl);
        //   redisStore.on('error', (error: Error) => {
        //     logger.warn(`Redis indisponível: ${error.message}`);
        //   });
        //   return { stores: [redisStore] };
        // } catch (error: unknown) {
        //   logger.warn(
        //     `Falha ao iniciar Redis; cache em memória. ${error instanceof Error ? error.message : String(error)}`,
        //   );
        //   return { stores: [] };
        // }
      },
    }),
  ],
  providers: [CacheService],
  exports: [CacheService],
})
export class RedisCacheModule {}
