import { BadGatewayException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { AxiosError } from 'axios';
import { CacheService } from '../infrastructure/redis-cache/cache.service';
import { RickAndMortyService } from '../integrations/rick-and-morty/rick-and-morty.service';
import {
  RickAndMortyCharacter,
  RickAndMortyEpisodeListResponse,
} from '../integrations/rick-and-morty/rick-and-morty.types';
import { EpisodeCharactersResponseDto } from './dto/episode-characters-response.dto';
import { EpisodesListResponseDto } from './dto/episodes-list-response.dto';
import { EpisodesService } from './episodes.service';
describe('EpisodesService', () => {
  let service: EpisodesService;
  let rickAndMortyService: {
    getEpisodesByPage: jest.Mock;
    getEpisodeById: jest.Mock;
    getCharactersByIds: jest.Mock;
  };
  let cacheService: {
    get: jest.Mock;
    set: jest.Mock;
  };
  const episode = {
    id: 1,
    name: 'Pilot',
    air_date: 'December 2, 2013',
    episode: 'S01E01',
    characters: [
      'https://rickandmortyapi.com/api/character/2',
      'https://rickandmortyapi.com/api/character/1',
      'https://rickandmortyapi.com/api/character/3',
    ],
    url: 'https://rickandmortyapi.com/api/episode/1',
    created: '2017-11-10T12:56:33.798Z',
  };
  const characters: RickAndMortyCharacter[] = [
    {
      id: 2,
      name: 'morty smith',
      status: 'Alive',
      species: 'Human',
      type: '',
      gender: 'Male',
      origin: { name: 'unknown', url: '' },
      location: { name: 'Citadel of Ricks', url: '' },
      image: '',
      episode: [],
      url: '',
      created: '',
    },
    {
      id: 1,
      name: 'Rick Sanchez',
      status: 'Alive',
      species: 'Human',
      type: '',
      gender: 'Male',
      origin: { name: 'Earth', url: '' },
      location: { name: 'Citadel of Ricks', url: '' },
      image: '',
      episode: [],
      url: '',
      created: '',
    },
    {
      id: 3,
      name: 'Rick Sanchez',
      status: 'Alive',
      species: 'Human',
      type: '',
      gender: 'Male',
      origin: { name: 'Earth', url: '' },
      location: { name: 'Citadel of Ricks', url: '' },
      image: '',
      episode: [],
      url: '',
      created: '',
    },
  ];
  const expectedResponse: EpisodeCharactersResponseDto = {
    id: 1,
    name: 'Pilot',
    airDate: 'December 2, 2013',
    episode: 'S01E01',
    characters: [
      {
        id: 2,
        name: 'morty smith',
        status: 'Alive',
        species: 'Human',
        type: '',
        gender: 'Male',
        image: '',
        originName: 'unknown',
        locationName: 'Citadel of Ricks',
      },
      {
        id: 1,
        name: 'Rick Sanchez',
        status: 'Alive',
        species: 'Human',
        type: '',
        gender: 'Male',
        image: '',
        originName: 'Earth',
        locationName: 'Citadel of Ricks',
      },
      {
        id: 3,
        name: 'Rick Sanchez',
        status: 'Alive',
        species: 'Human',
        type: '',
        gender: 'Male',
        image: '',
        originName: 'Earth',
        locationName: 'Citadel of Ricks',
      },
    ],
  };
  const externalListPage1: RickAndMortyEpisodeListResponse = {
    info: {
      count: 51,
      pages: 3,
      next: 'https://rickandmortyapi.com/api/episode?page=2',
      prev: null,
    },
    results: [
      {
        id: 1,
        name: 'Pilot',
        air_date: 'December 2, 2013',
        episode: 'S01E01',
        characters: ['https://rickandmortyapi.com/api/character/1'],
        url: 'https://rickandmortyapi.com/api/episode/1',
        created: '2017-11-10T12:56:33.798Z',
      },
      {
        id: 2,
        name: 'Lawnmower Dog',
        air_date: 'December 9, 2013',
        episode: 'S01E02',
        characters: ['https://rickandmortyapi.com/api/character/1'],
        url: 'https://rickandmortyapi.com/api/episode/2',
        created: '2017-11-10T12:56:33.916Z',
      },
    ],
  };
  const expectedListPage1: EpisodesListResponseDto = {
    info: {
      count: 51,
      pages: 3,
      currentPage: 1,
      nextPage: 2,
      previousPage: null,
    },
    results: [
      {
        id: 1,
        name: 'Pilot',
        airDate: 'December 2, 2013',
        episode: 'S01E01',
      },
      {
        id: 2,
        name: 'Lawnmower Dog',
        airDate: 'December 9, 2013',
        episode: 'S01E02',
      },
    ],
  };
  const expectedIdSearchResponse: EpisodesListResponseDto = {
    info: {
      count: 1,
      pages: 1,
      currentPage: 1,
      nextPage: null,
      previousPage: null,
    },
    results: [
      {
        id: 1,
        name: 'Pilot',
        airDate: 'December 2, 2013',
        episode: 'S01E01',
      },
    ],
  };
  const createNotFoundError = (): AxiosError => {
    const notFoundError = new AxiosError('Not Found');
    notFoundError.response = {
      status: 404,
      statusText: 'Not Found',
      headers: {},
      config: { headers: {} as never },
      data: {},
    };
    return notFoundError;
  };
  beforeEach(async () => {
    rickAndMortyService = {
      getEpisodesByPage: jest.fn(),
      getEpisodeById: jest.fn(),
      getCharactersByIds: jest.fn(),
    };
    cacheService = {
      get: jest.fn(),
      set: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EpisodesService,
        {
          provide: RickAndMortyService,
          useValue: rickAndMortyService,
        },
        {
          provide: CacheService,
          useValue: cacheService,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: unknown) => {
              if (key === 'EPISODES_CACHE_TTL_SECONDS') {
                return 3600;
              }
              return defaultValue;
            }),
          },
        },
      ],
    }).compile();
    service = module.get<EpisodesService>(EpisodesService);
  });
  it('should be defined', () => {
    expect(service).toBeDefined();
  });
  describe('listEpisodes', () => {
    it('should map paginated episodes and metadata without characters', async () => {
      cacheService.get.mockResolvedValue(undefined);
      rickAndMortyService.getEpisodesByPage.mockResolvedValue(
        externalListPage1,
      );
      const result = await service.listEpisodes(1);
      expect(rickAndMortyService.getEpisodesByPage).toHaveBeenCalledWith(
        1,
        undefined,
      );
      expect(result).toEqual(expectedListPage1);
      expect(result.results[0]).not.toHaveProperty('characters');
      expect(result.info).not.toHaveProperty('next');
      expect(result.info).not.toHaveProperty('prev');
    });
    it('should map nextPage and previousPage for a middle page', async () => {
      cacheService.get.mockResolvedValue(undefined);
      rickAndMortyService.getEpisodesByPage.mockResolvedValue({
        ...externalListPage1,
        info: {
          count: 51,
          pages: 3,
          next: 'https://rickandmortyapi.com/api/episode?page=3',
          prev: 'https://rickandmortyapi.com/api/episode?page=1',
        },
      });
      const result = await service.listEpisodes(2);
      expect(result.info).toEqual({
        count: 51,
        pages: 3,
        currentPage: 2,
        nextPage: 3,
        previousPage: 1,
      });
    });
    it('should map null nextPage on the last page', async () => {
      cacheService.get.mockResolvedValue(undefined);
      rickAndMortyService.getEpisodesByPage.mockResolvedValue({
        ...externalListPage1,
        info: {
          count: 51,
          pages: 3,
          next: null,
          prev: 'https://rickandmortyapi.com/api/episode?page=2',
        },
      });
      const result = await service.listEpisodes(3);
      expect(result.info.currentPage).toBe(3);
      expect(result.info.nextPage).toBeNull();
      expect(result.info.previousPage).toBe(2);
    });
    it('should return cached response on cache hit without calling external API', async () => {
      cacheService.get.mockResolvedValue(expectedListPage1);
      const result = await service.listEpisodes(1);
      expect(result).toEqual(expectedListPage1);
      expect(cacheService.get).toHaveBeenCalledWith('episodes:list:v1:page:1');
      expect(rickAndMortyService.getEpisodesByPage).not.toHaveBeenCalled();
      expect(cacheService.set).not.toHaveBeenCalled();
    });
    it('should fetch from API and store mapped response on cache miss', async () => {
      cacheService.get.mockResolvedValue(undefined);
      rickAndMortyService.getEpisodesByPage.mockResolvedValue(
        externalListPage1,
      );
      const result = await service.listEpisodes(1);
      expect(result).toEqual(expectedListPage1);
      expect(cacheService.set).toHaveBeenCalledWith(
        'episodes:list:v1:page:1',
        expectedListPage1,
        3600,
      );
    });
    it('should fallback to external API when cache read returns empty (Redis miss/failure)', async () => {
      cacheService.get.mockResolvedValue(undefined);
      rickAndMortyService.getEpisodesByPage.mockResolvedValue(
        externalListPage1,
      );
      const result = await service.listEpisodes(1);
      expect(result).toEqual(expectedListPage1);
      expect(rickAndMortyService.getEpisodesByPage).toHaveBeenCalledWith(
        1,
        undefined,
      );
      expect(cacheService.set).toHaveBeenCalledWith(
        'episodes:list:v1:page:1',
        expectedListPage1,
        3600,
      );
    });
    it('should still return response after attempting cache write', async () => {
      cacheService.get.mockResolvedValue(undefined);
      cacheService.set.mockResolvedValue(undefined);
      rickAndMortyService.getEpisodesByPage.mockResolvedValue(
        externalListPage1,
      );
      await expect(service.listEpisodes(1)).resolves.toEqual(expectedListPage1);
      expect(cacheService.set).toHaveBeenCalled();
    });
    it('should throw NotFoundException when page does not exist', async () => {
      cacheService.get.mockResolvedValue(undefined);
      rickAndMortyService.getEpisodesByPage.mockRejectedValue(
        createNotFoundError(),
      );
      await expect(service.listEpisodes(999)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(cacheService.set).not.toHaveBeenCalled();
    });
    it('should throw BadGatewayException when integration fails', async () => {
      cacheService.get.mockResolvedValue(undefined);
      rickAndMortyService.getEpisodesByPage.mockRejectedValue(
        new Error('network down'),
      );
      await expect(service.listEpisodes(1)).rejects.toBeInstanceOf(
        BadGatewayException,
      );
      expect(cacheService.set).not.toHaveBeenCalled();
    });
    it('should throw BadGatewayException when external response is invalid', async () => {
      cacheService.get.mockResolvedValue(undefined);
      rickAndMortyService.getEpisodesByPage.mockResolvedValue({
        info: { count: 1, pages: 1, next: null, prev: null },
        results: [{ id: 'bad' }],
      } as unknown as RickAndMortyEpisodeListResponse);
      await expect(service.listEpisodes(1)).rejects.toBeInstanceOf(
        BadGatewayException,
      );
      expect(cacheService.set).not.toHaveBeenCalled();
    });
    it('should search by id using the external episode endpoint', async () => {
      cacheService.get.mockResolvedValue(undefined);
      rickAndMortyService.getEpisodeById.mockResolvedValue(episode);
      const result = await service.listEpisodes(1, '1');
      expect(rickAndMortyService.getEpisodeById).toHaveBeenCalledWith(1);
      expect(rickAndMortyService.getEpisodesByPage).not.toHaveBeenCalled();
      expect(result).toEqual(expectedIdSearchResponse);
      expect(cacheService.set).toHaveBeenCalledWith(
        'episodes:search:v1:id:1',
        expectedIdSearchResponse,
        3600,
      );
    });
    it('should ignore page when search is numeric (e.g. search=1&page=2)', async () => {
      cacheService.get.mockResolvedValue(undefined);
      rickAndMortyService.getEpisodeById.mockResolvedValue(episode);
      const result = await service.listEpisodes(2, '1');
      expect(rickAndMortyService.getEpisodeById).toHaveBeenCalledWith(1);
      expect(rickAndMortyService.getEpisodesByPage).not.toHaveBeenCalled();
      expect(result).toEqual(expectedIdSearchResponse);
      expect(result.info.currentPage).toBe(1);
      expect(result.info.pages).toBe(1);
      expect(result.info.nextPage).toBeNull();
      expect(result.info.previousPage).toBeNull();
      expect(cacheService.get).toHaveBeenCalledWith('episodes:search:v1:id:1');
      expect(cacheService.set).toHaveBeenCalledWith(
        'episodes:search:v1:id:1',
        expectedIdSearchResponse,
        3600,
      );
      expect(cacheService.set).not.toHaveBeenCalledWith(
        expect.stringContaining('page:2'),
        expect.anything(),
        expect.anything(),
      );
    });
    it('should throw NotFoundException when numeric search id does not exist', async () => {
      cacheService.get.mockResolvedValue(undefined);
      rickAndMortyService.getEpisodeById.mockRejectedValue(
        createNotFoundError(),
      );
      await expect(service.listEpisodes(2, '9999')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(rickAndMortyService.getEpisodesByPage).not.toHaveBeenCalled();
      expect(cacheService.set).not.toHaveBeenCalled();
    });
    it('should return cached id search without calling external API', async () => {
      cacheService.get.mockResolvedValue(expectedIdSearchResponse);
      const result = await service.listEpisodes(3, '1');
      expect(result).toEqual(expectedIdSearchResponse);
      expect(cacheService.get).toHaveBeenCalledWith('episodes:search:v1:id:1');
      expect(rickAndMortyService.getEpisodeById).not.toHaveBeenCalled();
      expect(cacheService.set).not.toHaveBeenCalled();
    });
    it('should search by name using the external name filter and page', async () => {
      cacheService.get.mockResolvedValue(undefined);
      rickAndMortyService.getEpisodesByPage.mockResolvedValue({
        info: {
          count: 2,
          pages: 1,
          next: null,
          prev: null,
        },
        results: [externalListPage1.results[0]],
      });
      const result = await service.listEpisodes(1, 'Pilot');
      expect(rickAndMortyService.getEpisodesByPage).toHaveBeenCalledWith(
        1,
        'pilot',
      );
      expect(rickAndMortyService.getEpisodeById).not.toHaveBeenCalled();
      expect(result).toEqual({
        info: {
          count: 2,
          pages: 1,
          currentPage: 1,
          nextPage: null,
          previousPage: null,
        },
        results: [expectedListPage1.results[0]],
      });
      expect(cacheService.set).toHaveBeenCalledWith(
        'episodes:search:v1:name:pilot:page:1',
        expect.any(Object),
        3600,
      );
    });
    it('should normalize name search case before calling the external API', async () => {
      cacheService.get.mockResolvedValue(undefined);
      rickAndMortyService.getEpisodesByPage.mockResolvedValue({
        info: {
          count: 1,
          pages: 1,
          next: null,
          prev: null,
        },
        results: [
          {
            id: 46,
            name: 'Amortycan Grickfitti',
            air_date: 'July 18, 2021',
            episode: 'S05E05',
            characters: [],
            url: '',
            created: '',
          },
        ],
      });
      const result = await service.listEpisodes(1, 'Amortycan Grickfitti');
      expect(rickAndMortyService.getEpisodesByPage).toHaveBeenCalledWith(
        1,
        'amortycan grickfitti',
      );
      expect(result.results[0]?.name).toBe('Amortycan Grickfitti');
      expect(cacheService.set).toHaveBeenCalledWith(
        'episodes:search:v1:name:amortycan%20grickfitti:page:1',
        expect.any(Object),
        3600,
      );
    });
    it('should respect page when searching by name', async () => {
      cacheService.get.mockResolvedValue(undefined);
      rickAndMortyService.getEpisodesByPage.mockResolvedValue({
        info: {
          count: 25,
          pages: 2,
          next: null,
          prev: 'https://rickandmortyapi.com/api/episode?name=rick&page=1',
        },
        results: [externalListPage1.results[1]],
      });
      const result = await service.listEpisodes(2, 'Rick');
      expect(rickAndMortyService.getEpisodesByPage).toHaveBeenCalledWith(
        2,
        'rick',
      );
      expect(result.info.currentPage).toBe(2);
      expect(result.info.previousPage).toBe(1);
      expect(cacheService.set).toHaveBeenCalledWith(
        'episodes:search:v1:name:rick:page:2',
        expect.any(Object),
        3600,
      );
    });
    it('should map external 404 on name search to 200-style empty results', async () => {
      cacheService.get.mockResolvedValue(undefined);
      rickAndMortyService.getEpisodesByPage.mockRejectedValue(
        createNotFoundError(),
      );
      const result = await service.listEpisodes(1, 'xyz-no-match');
      expect(result).toEqual({
        info: {
          count: 0,
          pages: 0,
          currentPage: 1,
          nextPage: null,
          previousPage: null,
        },
        results: [],
      });
      expect(rickAndMortyService.getEpisodesByPage).toHaveBeenCalledWith(
        1,
        'xyz-no-match',
      );
      expect(cacheService.set).toHaveBeenCalledWith(
        'episodes:search:v1:name:xyz-no-match:page:1',
        {
          info: {
            count: 0,
            pages: 0,
            currentPage: 1,
            nextPage: null,
            previousPage: null,
          },
          results: [],
        },
        3600,
      );
    });
    it('should keep list, name and id cache keys separated', async () => {
      cacheService.get.mockResolvedValue(undefined);
      rickAndMortyService.getEpisodesByPage.mockResolvedValue(
        externalListPage1,
      );
      rickAndMortyService.getEpisodeById.mockResolvedValue(episode);
      await service.listEpisodes(1);
      await service.listEpisodes(1, 'Pilot');
      await service.listEpisodes(1, '1');
      expect(cacheService.set).toHaveBeenNthCalledWith(
        1,
        'episodes:list:v1:page:1',
        expect.any(Object),
        3600,
      );
      expect(cacheService.set).toHaveBeenNthCalledWith(
        2,
        'episodes:search:v1:name:pilot:page:1',
        expect.any(Object),
        3600,
      );
      expect(cacheService.set).toHaveBeenNthCalledWith(
        3,
        'episodes:search:v1:id:1',
        expect.any(Object),
        3600,
      );
    });
    it('should fallback to external API for name search when Redis misses', async () => {
      cacheService.get.mockResolvedValue(undefined);
      cacheService.set.mockResolvedValue(undefined);
      rickAndMortyService.getEpisodesByPage.mockResolvedValue({
        info: {
          count: 1,
          pages: 1,
          next: null,
          prev: null,
        },
        results: [externalListPage1.results[0]],
      });
      await expect(service.listEpisodes(1, 'Pilot')).resolves.toMatchObject({
        results: [expectedListPage1.results[0]],
      });
      expect(rickAndMortyService.getEpisodesByPage).toHaveBeenCalledWith(
        1,
        'pilot',
      );
      expect(cacheService.set).toHaveBeenCalled();
    });
  });
  describe('getEpisodeCharacters', () => {
    it('should return episode characters sorted by name case-insensitively and by id on ties', async () => {
      cacheService.get.mockResolvedValue(undefined);
      rickAndMortyService.getEpisodeById.mockResolvedValue(episode);
      rickAndMortyService.getCharactersByIds.mockResolvedValue(characters);
      const result = await service.getEpisodeCharacters(1);
      expect(rickAndMortyService.getEpisodeById).toHaveBeenCalledWith(1);
      expect(rickAndMortyService.getCharactersByIds).toHaveBeenCalledWith([
        2, 1, 3,
      ]);
      expect(result).toEqual(expectedResponse);
    });
    it('should throw NotFoundException when episode does not exist', async () => {
      cacheService.get.mockResolvedValue(undefined);
      rickAndMortyService.getEpisodeById.mockRejectedValue(
        createNotFoundError(),
      );
      await expect(service.getEpisodeCharacters(9999)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(rickAndMortyService.getCharactersByIds).not.toHaveBeenCalled();
      expect(cacheService.set).not.toHaveBeenCalled();
    });
    it('should throw BadGatewayException when integration fails', async () => {
      cacheService.get.mockResolvedValue(undefined);
      rickAndMortyService.getEpisodeById.mockRejectedValue(
        new Error('network down'),
      );
      await expect(service.getEpisodeCharacters(1)).rejects.toBeInstanceOf(
        BadGatewayException,
      );
      expect(cacheService.set).not.toHaveBeenCalled();
    });
    it('should throw BadGatewayException when external request times out', async () => {
      cacheService.get.mockResolvedValue(undefined);
      const timeoutError = new AxiosError('timeout of 8000ms exceeded');
      timeoutError.code = 'ECONNABORTED';
      rickAndMortyService.getEpisodeById.mockRejectedValue(timeoutError);
      await expect(service.getEpisodeCharacters(1)).rejects.toBeInstanceOf(
        BadGatewayException,
      );
      expect(rickAndMortyService.getCharactersByIds).not.toHaveBeenCalled();
      expect(cacheService.set).not.toHaveBeenCalled();
    });
    it('should throw BadGatewayException when episode payload is incomplete', async () => {
      cacheService.get.mockResolvedValue(undefined);
      rickAndMortyService.getEpisodeById.mockResolvedValue({
        id: 1,
        name: 'Pilot',
        episode: 'S01E01',
        characters: ['https://rickandmortyapi.com/api/character/1'],
      } as never);
      await expect(service.getEpisodeCharacters(1)).rejects.toBeInstanceOf(
        BadGatewayException,
      );
      expect(rickAndMortyService.getCharactersByIds).not.toHaveBeenCalled();
      expect(cacheService.set).not.toHaveBeenCalled();
    });
    it('should throw BadGatewayException when episode characters field is missing', async () => {
      cacheService.get.mockResolvedValue(undefined);
      rickAndMortyService.getEpisodeById.mockResolvedValue({
        id: 1,
        name: 'Pilot',
        air_date: 'December 2, 2013',
        episode: 'S01E01',
      } as never);
      await expect(service.getEpisodeCharacters(1)).rejects.toBeInstanceOf(
        BadGatewayException,
      );
      expect(rickAndMortyService.getCharactersByIds).not.toHaveBeenCalled();
      expect(cacheService.set).not.toHaveBeenCalled();
    });
    it('should throw BadGatewayException when character payload lacks origin/location', async () => {
      cacheService.get.mockResolvedValue(undefined);
      rickAndMortyService.getEpisodeById.mockResolvedValue(episode);
      rickAndMortyService.getCharactersByIds.mockResolvedValue([
        {
          id: 1,
          name: 'Rick Sanchez',
          status: 'Alive',
          species: 'Human',
          type: '',
          gender: 'Male',
          image: '',
          origin: null,
          location: null,
          episode: [],
          url: '',
          created: '',
        } as never,
      ]);
      await expect(service.getEpisodeCharacters(1)).rejects.toBeInstanceOf(
        BadGatewayException,
      );
      expect(cacheService.set).not.toHaveBeenCalled();
    });
    it('should throw BadGatewayException when character batch fails after episode fetch', async () => {
      cacheService.get.mockResolvedValue(undefined);
      rickAndMortyService.getEpisodeById.mockResolvedValue(episode);
      rickAndMortyService.getCharactersByIds.mockRejectedValue(
        new Error('network down'),
      );
      await expect(service.getEpisodeCharacters(1)).rejects.toBeInstanceOf(
        BadGatewayException,
      );
      expect(cacheService.set).not.toHaveBeenCalled();
    });
    it('should return cached response on cache hit without calling external API', async () => {
      cacheService.get.mockResolvedValue(expectedResponse);
      const result = await service.getEpisodeCharacters(1);
      expect(result).toEqual(expectedResponse);
      expect(cacheService.get).toHaveBeenCalledWith('episodes:1:characters');
      expect(rickAndMortyService.getEpisodeById).not.toHaveBeenCalled();
      expect(rickAndMortyService.getCharactersByIds).not.toHaveBeenCalled();
      expect(cacheService.set).not.toHaveBeenCalled();
    });
    it('should fetch from API and store response on cache miss', async () => {
      cacheService.get.mockResolvedValue(undefined);
      rickAndMortyService.getEpisodeById.mockResolvedValue(episode);
      rickAndMortyService.getCharactersByIds.mockResolvedValue(characters);
      const result = await service.getEpisodeCharacters(1);
      expect(result).toEqual(expectedResponse);
      expect(cacheService.set).toHaveBeenCalledWith(
        'episodes:1:characters',
        expectedResponse,
        3600,
      );
    });
    it('should fallback to external API when cache read returns empty (Redis miss/failure)', async () => {
      cacheService.get.mockResolvedValue(undefined);
      rickAndMortyService.getEpisodeById.mockResolvedValue(episode);
      rickAndMortyService.getCharactersByIds.mockResolvedValue(characters);
      const result = await service.getEpisodeCharacters(1);
      expect(result).toEqual(expectedResponse);
      expect(rickAndMortyService.getEpisodeById).toHaveBeenCalledWith(1);
      expect(cacheService.set).toHaveBeenCalledWith(
        'episodes:1:characters',
        expectedResponse,
        3600,
      );
    });
    it('should still return response after attempting cache write', async () => {
      cacheService.get.mockResolvedValue(undefined);
      cacheService.set.mockResolvedValue(undefined);
      rickAndMortyService.getEpisodeById.mockResolvedValue(episode);
      rickAndMortyService.getCharactersByIds.mockResolvedValue(characters);
      await expect(service.getEpisodeCharacters(1)).resolves.toEqual(
        expectedResponse,
      );
      expect(cacheService.set).toHaveBeenCalled();
    });
  });
});
