import { Module } from '@nestjs/common';
import { RedisCacheModule } from '../infrastructure/redis-cache/redis-cache.module';
import { HealthController } from './health.controller';

@Module({
  imports: [RedisCacheModule],
  controllers: [HealthController],
})
export class HealthModule {}
