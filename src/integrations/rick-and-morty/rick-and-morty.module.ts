import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { createRickAndMortyHttpConfig } from './rick-and-morty.constants';
import { RickAndMortyService } from './rick-and-morty.service';
@Module({
  imports: [
    HttpModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) =>
        createRickAndMortyHttpConfig(
          configService.getOrThrow<string>('RICK_AND_MORTY_API_BASE_URL'),
        ),
      inject: [ConfigService],
    }),
  ],
  providers: [RickAndMortyService],
  exports: [RickAndMortyService],
})
export class RickAndMortyModule {}
