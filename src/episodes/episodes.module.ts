import { Module } from '@nestjs/common';
import { RedisCacheModule } from '../infrastructure/redis-cache/redis-cache.module';
import { RickAndMortyModule } from '../integrations/rick-and-morty/rick-and-morty.module';
import { EpisodesController } from './episodes.controller';
import { EpisodesService } from './episodes.service';
@Module({
  imports: [RickAndMortyModule, RedisCacheModule],
  controllers: [EpisodesController],
  providers: [EpisodesService],
})
export class EpisodesModule {}
