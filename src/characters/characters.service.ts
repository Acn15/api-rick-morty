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
  RickAndMortyCharacterFilters,
  RickAndMortyCharacterListResponse,
  RickAndMortyEpisode,
} from '../integrations/rick-and-morty/rick-and-morty.types';
import {
  CharacterDetailResponseDto,
  CharacterEpisodeSummaryDto,
} from './dto/character-detail-response.dto';
import { CharacterResponseDto } from './dto/character-response.dto';
import { CharactersListResponseDto } from './dto/characters-list-response.dto';
export type ListCharactersInput = {
  page: number;
  name?: string;
  status?: string;
  species?: string;
  type?: string;
  gender?: string;
};
type NormalizedCharacterFilters = {
  name?: string;
  status?: string;
  species?: string;
  type?: string;
  gender?: string;
};
@Injectable()
export class CharactersService {
  private readonly cacheTtlSeconds: number;
  constructor(
    private readonly rickAndMortyService: RickAndMortyService,
    private readonly cacheService: CacheService,
    private readonly configService: ConfigService,
  ) {
    this.cacheTtlSeconds = this.resolveCacheTtlSeconds();
  }
  async listCharacters(
    input: ListCharactersInput,
  ): Promise<CharactersListResponseDto> {
    const filters = this.normalizeFilters(input);
    const cacheKey = this.buildListCacheKey(input.page, filters);
    const cached =
      await this.cacheService.get<CharactersListResponseDto>(cacheKey);
    if (cached !== undefined) {
      return cached;
    }
    const response = await this.fetchCharactersPage(input.page, filters);
    await this.cacheService.set(cacheKey, response, this.cacheTtlSeconds);
    return response;
  }
  async getCharacterById(id: number): Promise<CharacterDetailResponseDto> {
    const cacheKey = this.buildDetailCacheKey(id);
    const cached =
      await this.cacheService.get<CharacterDetailResponseDto>(cacheKey);
    if (cached !== undefined) {
      return cached;
    }
    const response = await this.fetchCharacterDetail(id);
    await this.cacheService.set(cacheKey, response, this.cacheTtlSeconds);
    return response;
  }
  private async fetchCharacterDetail(
    id: number,
  ): Promise<CharacterDetailResponseDto> {
    const character = await this.fetchCharacter(id);
    if (
      !this.isValidCharacter(character) ||
      !Array.isArray(character.episode)
    ) {
      throw new BadGatewayException('Resposta inválida da API Rick and Morty');
    }
    const episodeIds = this.extractUniqueEpisodeIds(character.episode);
    const episodes = await this.fetchEpisodes(episodeIds);
    return this.toCharacterDetailResponse(character, episodes, episodeIds);
  }
  private async fetchCharactersPage(
    page: number,
    filters: NormalizedCharacterFilters,
  ): Promise<CharactersListResponseDto> {
    const external = await this.fetchCharacterList(page, filters);
    return this.toCharactersListResponse(external, page);
  }
  private async fetchCharacterList(
    page: number,
    filters: NormalizedCharacterFilters,
  ): Promise<RickAndMortyCharacterListResponse> {
    try {
      return await this.rickAndMortyService.getCharactersByPage(
        page,
        this.toExternalFilters(filters),
      );
    } catch (error: unknown) {
      if (this.isNotFoundError(error)) {
        if (this.hasFilters(filters)) {
          return this.emptyCharacterListResponse();
        }
        throw new NotFoundException(
          `Página de personagens ${page} não encontrada`,
        );
      }
      throw new BadGatewayException('Falha ao consultar a API Rick and Morty');
    }
  }
  private emptyCharacterListResponse(): RickAndMortyCharacterListResponse {
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
  private toCharactersListResponse(
    external: RickAndMortyCharacterListResponse,
    currentPage: number,
  ): CharactersListResponseDto {
    if (!this.isValidCharacterListResponse(external)) {
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
      results: results.map((character) => this.toCharacterResponse(character)),
    };
  }
  private toCharacterResponse(
    character: RickAndMortyCharacter,
  ): CharacterResponseDto {
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
  private toCharacterDetailResponse(
    character: RickAndMortyCharacter,
    episodes: RickAndMortyEpisode[],
    orderedEpisodeIds: number[],
  ): CharacterDetailResponseDto {
    const episodesById = new Map(
      episodes.map((episode) => [episode.id, episode]),
    );
    const orderedEpisodes = orderedEpisodeIds.map((episodeId) => {
      const episode = episodesById.get(episodeId);
      if (!episode || !this.isValidEpisodeSummary(episode)) {
        throw new BadGatewayException(
          'Resposta inválida da API Rick and Morty',
        );
      }
      return this.toEpisodeSummary(episode);
    });
    return {
      ...this.toCharacterResponse(character),
      episodes: orderedEpisodes,
    };
  }
  private toEpisodeSummary(
    episode: RickAndMortyEpisode,
  ): CharacterEpisodeSummaryDto {
    return {
      id: episode.id,
      name: episode.name,
      episode: episode.episode,
      airDate: episode.air_date,
    };
  }
  private extractUniqueEpisodeIds(episodeUrls: string[]): number[] {
    const uniqueIds: number[] = [];
    const seen = new Set<number>();
    for (const url of episodeUrls) {
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
      if (seen.has(id)) {
        continue;
      }
      seen.add(id);
      uniqueIds.push(id);
    }
    return uniqueIds;
  }
  private async fetchEpisodes(ids: number[]): Promise<RickAndMortyEpisode[]> {
    if (ids.length === 0) {
      return [];
    }
    try {
      return await this.rickAndMortyService.getEpisodesByIds(ids);
    } catch {
      throw new BadGatewayException('Falha ao consultar a API Rick and Morty');
    }
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
  private isValidCharacterListResponse(
    external: RickAndMortyCharacterListResponse,
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
    return external.results.every((character) =>
      this.isValidCharacter(character),
    );
  }
  private isValidCharacter(character: RickAndMortyCharacter): boolean {
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
  private async fetchCharacter(id: number): Promise<RickAndMortyCharacter> {
    try {
      return await this.rickAndMortyService.getCharacterById(id);
    } catch (error: unknown) {
      if (this.isNotFoundError(error)) {
        throw new NotFoundException(`Personagem com ID ${id} não encontrado`);
      }
      throw new BadGatewayException('Falha ao consultar a API Rick and Morty');
    }
  }
  private normalizeFilters(
    input: ListCharactersInput,
  ): NormalizedCharacterFilters {
    const filters: NormalizedCharacterFilters = {};
    if (input.name !== undefined) {
      filters.name = this.normalizeTextFilter(input.name);
    }
    if (input.status !== undefined) {
      filters.status = input.status.trim().toLowerCase();
    }
    if (input.species !== undefined) {
      filters.species = this.normalizeTextFilter(input.species);
    }
    if (input.type !== undefined) {
      filters.type = this.normalizeTextFilter(input.type);
    }
    if (input.gender !== undefined) {
      filters.gender = input.gender.trim().toLowerCase();
    }
    return filters;
  }
  private normalizeTextFilter(value: string): string {
    return value.trim().toLowerCase();
  }
  private toExternalFilters(
    filters: NormalizedCharacterFilters,
  ): RickAndMortyCharacterFilters | undefined {
    if (!this.hasFilters(filters)) {
      return undefined;
    }
    return { ...filters };
  }
  private hasFilters(filters: NormalizedCharacterFilters): boolean {
    return (
      filters.name !== undefined ||
      filters.status !== undefined ||
      filters.species !== undefined ||
      filters.type !== undefined ||
      filters.gender !== undefined
    );
  }
  private buildListCacheKey(
    page: number,
    filters: NormalizedCharacterFilters,
  ): string {
    const parts = [`characters:list:v1:page:${page}`];
    if (filters.name !== undefined) {
      parts.push(`name:${encodeURIComponent(filters.name)}`);
    }
    if (filters.status !== undefined) {
      parts.push(`status:${filters.status}`);
    }
    if (filters.species !== undefined) {
      parts.push(`species:${encodeURIComponent(filters.species)}`);
    }
    if (filters.type !== undefined) {
      parts.push(`type:${encodeURIComponent(filters.type)}`);
    }
    if (filters.gender !== undefined) {
      parts.push(`gender:${filters.gender}`);
    }
    return parts.join(':');
  }
  private buildDetailCacheKey(id: number): string {
    return `characters:detail:v2:id:${id}`;
  }
  private resolveCacheTtlSeconds(): number {
    const ttlSeconds = Number(
      this.configService.get<string | number>(
        'CHARACTERS_CACHE_TTL_SECONDS',
        3600,
      ),
    );
    if (!Number.isFinite(ttlSeconds) || ttlSeconds <= 0) {
      throw new Error(
        'CHARACTERS_CACHE_TTL_SECONDS deve ser um número finito maior que zero',
      );
    }
    return ttlSeconds;
  }
  private isNotFoundError(error: unknown): boolean {
    return isAxiosError(error) && error.response?.status === 404;
  }
}
