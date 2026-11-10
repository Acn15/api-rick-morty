import { Module } from '@nestjs/common';
// import { CacheModule } from '@nestjs/cache-manager';
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
  // TEMP Vercel: sem CacheModule/Redis — CacheService usa Map em memória
  // imports: [
  //   CacheModule.register(),
  //   // CacheModule.registerAsync({ ... Redis/Upstash ... }),
  // ],
  providers: [CacheService],
  exports: [CacheService],
})
export class RedisCacheModule {}
