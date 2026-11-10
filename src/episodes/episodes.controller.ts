import { Controller, Get, Param, Query } from '@nestjs/common';
import { EpisodeCharactersResponseDto } from './dto/episode-characters-response.dto';
import { EpisodeIdParamDto } from './dto/episode-id.param';
import { EpisodesListResponseDto } from './dto/episodes-list-response.dto';
import { ListEpisodesQueryDto } from './dto/list-episodes-query.dto';
import { EpisodesService } from './episodes.service';
@Controller('episodes')
export class EpisodesController {
  constructor(private readonly episodesService: EpisodesService) {}
  @Get()
  listEpisodes(
    @Query()
    query: ListEpisodesQueryDto,
  ): Promise<EpisodesListResponseDto> {
    return this.episodesService.listEpisodes(query.page ?? 1, query.search);
  }
  @Get(':id/characters')
  getEpisodeCharacters(
    @Param()
    params: EpisodeIdParamDto,
  ): Promise<EpisodeCharactersResponseDto> {
    return this.episodesService.getEpisodeCharacters(params.id);
  }
}
