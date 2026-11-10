import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import {
  RickAndMortyCharacter,
  RickAndMortyCharacterFilters,
  RickAndMortyCharacterListResponse,
  RickAndMortyEpisode,
  RickAndMortyEpisodeListResponse,
} from './rick-and-morty.types';
@Injectable()
export class RickAndMortyService {
  constructor(private readonly httpService: HttpService) {}
  async getEpisodesByPage(
    page: number,
    name?: string,
  ): Promise<RickAndMortyEpisodeListResponse> {
    const params: {
      page: number;
      name?: string;
    } = { page };
    if (name !== undefined) {
      params.name = name;
    }
    const { data } = await firstValueFrom(
      this.httpService.get<RickAndMortyEpisodeListResponse>('/episode', {
        params,
      }),
    );
    return data;
  }
  async getEpisodeById(id: number): Promise<RickAndMortyEpisode> {
    const { data } = await firstValueFrom(
      this.httpService.get<RickAndMortyEpisode>(`/episode/${id}`),
    );
    return data;
  }
  async getEpisodesByIds(ids: number[]): Promise<RickAndMortyEpisode[]> {
    if (ids.length === 0) {
      return [];
    }
    const { data } = await firstValueFrom(
      this.httpService.get<RickAndMortyEpisode | RickAndMortyEpisode[]>(
        `/episode/${ids.join(',')}`,
      ),
    );
    return Array.isArray(data) ? data : [data];
  }
  async getCharactersByPage(
    page: number,
    filters?: RickAndMortyCharacterFilters,
  ): Promise<RickAndMortyCharacterListResponse> {
    const params: {
      page: number;
      name?: string;
      status?: string;
      species?: string;
      type?: string;
      gender?: string;
    } = { page };
    if (filters?.name !== undefined) {
      params.name = filters.name;
    }
    if (filters?.status !== undefined) {
      params.status = filters.status;
    }
    if (filters?.species !== undefined) {
      params.species = filters.species;
    }
    if (filters?.type !== undefined) {
      params.type = filters.type;
    }
    if (filters?.gender !== undefined) {
      params.gender = filters.gender;
    }
    const { data } = await firstValueFrom(
      this.httpService.get<RickAndMortyCharacterListResponse>('/character', {
        params,
      }),
    );
    return data;
  }
  async getCharacterById(id: number): Promise<RickAndMortyCharacter> {
    const { data } = await firstValueFrom(
      this.httpService.get<RickAndMortyCharacter>(`/character/${id}`),
    );
    return data;
  }
  async getCharactersByIds(ids: number[]): Promise<RickAndMortyCharacter[]> {
    if (ids.length === 0) {
      return [];
    }
    const { data } = await firstValueFrom(
      this.httpService.get<RickAndMortyCharacter | RickAndMortyCharacter[]>(
        `/character/${ids.join(',')}`,
      ),
    );
    return Array.isArray(data) ? data : [data];
  }
}
