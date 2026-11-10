import {
  BadGatewayException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { isAxiosError } from 'axios';
import { CacheService } from '../infrastructure/redis-cache/cache.service';
import { RickAndMortyService } from '../integrations/rick-and-morty/rick-and-morty.service';
import {
  RickAndMortyCharacter,
  RickAndMortyEpisode,
  RickAndMortyEpisodeListResponse,
} from '../integrations/rick-and-morty/rick-and-morty.types';
import {
  EpisodeCharacterResponseDto,
  EpisodeCharactersResponseDto,
} from './dto/episode-characters-response.dto';
import {
  EpisodeSummaryResponseDto,
  EpisodesListResponseDto,
} from './dto/episodes-list-response.dto';
@Injectable()
export class EpisodesService {
  private readonly cacheTtlSeconds: number;
  constructor(
    private readonly rickAndMortyService: RickAndMortyService,
    private readonly cacheService: CacheService,
    private readonly configService: ConfigService,
  ) {
    this.cacheTtlSeconds = this.resolveCacheTtlSeconds();
  }
  async listEpisodes(
    page: number,
    search?: string,
  ): Promise<EpisodesListResponseDto> {
    if (search === undefined) {
      return this.listEpisodesPage(page);
    }
    if (this.isNumericSearch(search)) {
      return this.searchEpisodeById(Number(search));
    }
    return this.searchEpisodesByName(this.normalizeSearchTerm(search), page);
  }
  async getEpisodeCharacters(
    id: number,
  ): Promise<EpisodeCharactersResponseDto> {
    const cacheKey = this.buildCharactersCacheKey(id);
    const cached =
      await this.cacheService.get<EpisodeCharactersResponseDto>(cacheKey);
    if (cached !== undefined) {
      return cached;
    }
    const response = await this.fetchEpisodeCharacters(id);
    await this.cacheService.set(cacheKey, response, this.cacheTtlSeconds);
    return response;
  }
  private async listEpisodesPage(
    page: number,
  ): Promise<EpisodesListResponseDto> {
    const cacheKey = this.buildListCacheKey(page);
    const cached =
      await this.cacheService.get<EpisodesListResponseDto>(cacheKey);
    if (cached !== undefined) {
      return cached;
    }
    const response = await this.fetchEpisodesPage(page);
    await this.cacheService.set(cacheKey, response, this.cacheTtlSeconds);
    return response;
  }
  private async searchEpisodeById(
    id: number,
  ): Promise<EpisodesListResponseDto> {
    const cacheKey = this.buildIdSearchCacheKey(id);
    const cached =
      await this.cacheService.get<EpisodesListResponseDto>(cacheKey);
    if (cached !== undefined) {
      return cached;
    }
    const episode = await this.fetchEpisode(id);
    if (!this.isValidEpisodeSummary(episode)) {
      throw new BadGatewayException('Resposta inválida da API Rick and Morty');
    }
    const response = this.toSingleEpisodeListResponse(episode);
    await this.cacheService.set(cacheKey, response, this.cacheTtlSeconds);
    return response;
  }
  private async searchEpisodesByName(
    name: string,
    page: number,
  ): Promise<EpisodesListResponseDto> {
    const cacheKey = this.buildNameSearchCacheKey(name, page);
    const cached =
      await this.cacheService.get<EpisodesListResponseDto>(cacheKey);
    if (cached !== undefined) {
      return cached;
    }
    const response = await this.fetchEpisodesPage(page, name);
    await this.cacheService.set(cacheKey, response, this.cacheTtlSeconds);
    return response;
  }
  private async fetchEpisodesPage(
    page: number,
    name?: string,
  ): Promise<EpisodesListResponseDto> {
    const external = await this.fetchEpisodeList(page, name);
    return this.toEpisodesListResponse(external, page);
  }
  private async fetchEpisodeList(
    page: number,
    name?: string,
  ): Promise<RickAndMortyEpisodeListResponse> {
    try {
      return await this.rickAndMortyService.getEpisodesByPage(page, name);
    } catch (error: unknown) {
      if (this.isNotFoundError(error)) {
        if (name !== undefined) {
          return this.emptyEpisodeListResponse();
        }
        throw new NotFoundException(
          `Página de episódios ${page} não encontrada`,
        );
      }
      throw new BadGatewayException('Falha ao consultar a API Rick and Morty');
    }
  }
  private emptyEpisodeListResponse(): RickAndMortyEpisodeListResponse {
    return {
      info: {
        count: 0,
        pages: 0,
        next: null,
        prev: null,
      },
      results: [],
    };
  }
  private toSingleEpisodeListResponse(
    episode: RickAndMortyEpisode,
  ): EpisodesListResponseDto {
    return {
      info: {
        count: 1,
        pages: 1,
        currentPage: 1,
        nextPage: null,
        previousPage: null,
      },
      results: [this.toEpisodeSummary(episode)],
    };
  }
  private toEpisodesListResponse(
    external: RickAndMortyEpisodeListResponse,
    currentPage: number,
  ): EpisodesListResponseDto {
    if (!this.isValidEpisodeListResponse(external)) {
      throw new BadGatewayException('Resposta inválida da API Rick and Morty');
    }
    const { info, results } = external;
    return {
      info: {
        count: info.count,
        pages: info.pages,
        currentPage,
        nextPage:
          info.pages > 0 && currentPage < info.pages ? currentPage + 1 : null,
        previousPage:
          info.pages > 0 && currentPage > 1 ? currentPage - 1 : null,
      },
      results: results.map((episode) => this.toEpisodeSummary(episode)),
    };
  }
  private toEpisodeSummary(
    episode: RickAndMortyEpisode,
  ): EpisodeSummaryResponseDto {
    return {
      id: episode.id,
      name: episode.name,
      airDate: episode.air_date,
      episode: episode.episode,
    };
  }
  private isValidEpisodeListResponse(
    external: RickAndMortyEpisodeListResponse,
  ): boolean {
    if (
      external === null ||
      typeof external !== 'object' ||
      external.info === null ||
      typeof external.info !== 'object' ||
      !Array.isArray(external.results)
    ) {
      return false;
    }
    const { count, pages } = external.info;
    if (
      !Number.isInteger(count) ||
      count < 0 ||
      !Number.isInteger(pages) ||
      pages < 0
    ) {
      return false;
    }
    return external.results.every((episode) =>
      this.isValidEpisodeSummary(episode),
    );
  }
  private isValidEpisodeSummary(episode: RickAndMortyEpisode): boolean {
    return (
      episode !== null &&
      typeof episode === 'object' &&
      Number.isInteger(episode.id) &&
      episode.id >= 1 &&
      typeof episode.name === 'string' &&
      typeof episode.air_date === 'string' &&
      typeof episode.episode === 'string'
    );
  }
  private isValidEpisodeWithCharacters(episode: RickAndMortyEpisode): boolean {
    return (
      this.isValidEpisodeSummary(episode) && Array.isArray(episode.characters)
    );
  }
  private isValidMappedCharacter(character: RickAndMortyCharacter): boolean {
    return (
      character !== null &&
      typeof character === 'object' &&
      Number.isInteger(character.id) &&
      character.id >= 1 &&
      typeof character.name === 'string' &&
      typeof character.status === 'string' &&
      typeof character.species === 'string' &&
      typeof character.type === 'string' &&
      typeof character.gender === 'string' &&
      typeof character.image === 'string' &&
      character.origin !== null &&
      typeof character.origin === 'object' &&
      typeof character.origin.name === 'string' &&
      character.location !== null &&
      typeof character.location === 'object' &&
      typeof character.location.name === 'string'
    );
  }
  private async fetchEpisodeCharacters(
    id: number,
  ): Promise<EpisodeCharactersResponseDto> {
    const episode = await this.fetchEpisode(id);
    if (!this.isValidEpisodeWithCharacters(episode)) {
      throw new BadGatewayException('Resposta inválida da API Rick and Morty');
    }
    const characterIds = this.extractCharacterIds(episode.characters);
    const characters = await this.fetchCharacters(characterIds);
    if (
      !characters.every((character) => this.isValidMappedCharacter(character))
    ) {
      throw new BadGatewayException('Resposta inválida da API Rick and Morty');
    }
    return {
      id: episode.id,
      name: episode.name,
      airDate: episode.air_date,
      episode: episode.episode,
      characters: this.sortCharactersByName(characters).map((character) =>
        this.toCharacterResponse(character),
      ),
    };
  }
  private isNumericSearch(search: string): boolean {
    return /^\d+$/.test(search);
  }
  private normalizeSearchTerm(search: string): string {
    return search.trim().toLowerCase();
  }
  private buildListCacheKey(page: number): string {
    return `episodes:list:v1:page:${page}`;
  }
  private buildNameSearchCacheKey(name: string, page: number): string {
    return `episodes:search:v1:name:${encodeURIComponent(this.normalizeSearchTerm(name))}:page:${page}`;
  }
  private buildIdSearchCacheKey(id: number): string {
    return `episodes:search:v1:id:${id}`;
  }
  private buildCharactersCacheKey(id: number): string {
    return `episodes:${id}:characters`;
  }
  private async fetchEpisode(id: number): Promise<RickAndMortyEpisode> {
    try {
      return await this.rickAndMortyService.getEpisodeById(id);
    } catch (error: unknown) {
      if (this.isNotFoundError(error)) {
        throw new NotFoundException(`Episódio com ID ${id} não encontrado`);
      }
      throw new BadGatewayException('Falha ao consultar a API Rick and Morty');
    }
  }
  private async fetchCharacters(
    ids: number[],
  ): Promise<RickAndMortyCharacter[]> {
    try {
      return await this.rickAndMortyService.getCharactersByIds(ids);
    } catch {
      throw new BadGatewayException('Falha ao consultar a API Rick and Morty');
    }
  }
  private extractCharacterIds(characterUrls: string[]): number[] {
    return characterUrls.map((url) => {
      if (typeof url !== 'string') {
        throw new BadGatewayException(
          'Resposta inválida da API Rick and Morty',
        );
      }
      const id = Number(url.split('/').filter(Boolean).pop());
      if (!Number.isInteger(id) || id < 1) {
        throw new BadGatewayException(
          'Resposta inválida da API Rick and Morty',
        );
      }
      return id;
    });
  }
  private sortCharactersByName(
    characters: RickAndMortyCharacter[],
  ): RickAndMortyCharacter[] {
    return [...characters].sort((a, b) => {
      const byName = a.name.localeCompare(b.name, 'en', {
        sensitivity: 'base',
      });
      if (byName !== 0) {
        return byName;
      }
      return a.id - b.id;
    });
  }
  private toCharacterResponse(
    character: RickAndMortyCharacter,
  ): EpisodeCharacterResponseDto {
    return {
      id: character.id,
      name: character.name,
      status: character.status,
      species: character.species,
      type: character.type,
      gender: character.gender,
      image: character.image,
      originName: character.origin.name,
      locationName: character.location.name,
    };
  }
  private resolveCacheTtlSeconds(): number {
    const ttlSeconds = Number(
      this.configService.get<string | number>(
        'EPISODES_CACHE_TTL_SECONDS',
        3600,
      ),
    );
    if (!Number.isFinite(ttlSeconds) || ttlSeconds <= 0) {
      throw new Error(
        'EPISODES_CACHE_TTL_SECONDS deve ser um número finito maior que zero',
      );
    }
    return ttlSeconds;
  }
  private isNotFoundError(error: unknown): boolean {
    return isAxiosError(error) && error.response?.status === 404;
  }
}
