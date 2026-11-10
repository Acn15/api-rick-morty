import { Module } from '@nestjs/common';
import { RedisCacheModule } from '../infrastructure/redis-cache/redis-cache.module';
import { RickAndMortyModule } from '../integrations/rick-and-morty/rick-and-morty.module';
import { CharactersController } from './characters.controller';
import { CharactersService } from './characters.service';
@Module({
  imports: [RickAndMortyModule, RedisCacheModule],
  controllers: [CharactersController],
  providers: [CharactersService],
})
export class CharactersModule {}
