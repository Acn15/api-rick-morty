import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
// import { ConfigModule, ConfigService } from '@nestjs/config';
// import { Logger } from '@nestjs/common';
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
    // TEMP Vercel: memória padrão (sem Redis / sem stores: [])
    CacheModule.register(),
    // CacheModule.registerAsync({
    //   imports: [ConfigModule],
    //   inject: [ConfigService],
    //   useFactory: (configService: ConfigService) => {
    //     const logger = new Logger('RedisCacheModule');
    //     const redisUrl =
    //       configService.get<string>('REDIS_URL') ??
    //       configService.get<string>('KV_URL') ??
    //       buildRedisUrl(configService);
    //     if (!redisUrl) {
    //       return {};
    //     }
    //     try {
    //       const redisStore = createRedisKeyv(redisUrl);
    //       redisStore.on('error', (error: Error) => {
    //         logger.warn(`Redis indisponível: ${error.message}`);
    //       });
    //       return { stores: [redisStore] };
    //     } catch (error: unknown) {
    //       logger.warn(
    //         `Falha ao iniciar Redis; cache em memória. ${error instanceof Error ? error.message : String(error)}`,
    //       );
    //       return {};
    //     }
    //   },
    // }),
  ],
  providers: [CacheService],
  exports: [CacheService],
})
export class RedisCacheModule {}
