import { BadGatewayException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { AxiosError } from 'axios';
import { CacheService } from '../infrastructure/redis-cache/cache.service';
import { RickAndMortyService } from '../integrations/rick-and-morty/rick-and-morty.service';
import {
  RickAndMortyCharacter,
  RickAndMortyCharacterListResponse,
  RickAndMortyEpisode,
} from '../integrations/rick-and-morty/rick-and-morty.types';
import { CharactersService } from './characters.service';
import { CharacterDetailResponseDto } from './dto/character-detail-response.dto';
import { CharacterResponseDto } from './dto/character-response.dto';
import { CharactersListResponseDto } from './dto/characters-list-response.dto';
describe('CharactersService', () => {
  let service: CharactersService;
  let rickAndMortyService: {
    getCharactersByPage: jest.Mock;
    getCharacterById: jest.Mock;
    getEpisodesByIds: jest.Mock;
  };
  let cacheService: {
    get: jest.Mock;
    set: jest.Mock;
  };
  const character: RickAndMortyCharacter = {
    id: 1,
    name: 'Rick Sanchez',
    status: 'Alive',
    species: 'Human',
    type: '',
    gender: 'Male',
    origin: {
      name: 'Earth (C-137)',
      url: 'https://rickandmortyapi.com/api/location/1',
    },
    location: {
      name: 'Citadel of Ricks',
      url: 'https://rickandmortyapi.com/api/location/3',
    },
    image: 'https://rickandmortyapi.com/api/character/avatar/1.jpeg',
    episode: ['https://rickandmortyapi.com/api/episode/1'],
    url: 'https://rickandmortyapi.com/api/character/1',
    created: '2017-11-04T18:48:46.250Z',
  };
  const episode1: RickAndMortyEpisode = {
    id: 1,
    name: 'Pilot',
    air_date: 'December 2, 2013',
    episode: 'S01E01',
    characters: [],
    url: 'https://rickandmortyapi.com/api/episode/1',
    created: '2017-11-10T12:56:33.798Z',
  };
  const episode2: RickAndMortyEpisode = {
    id: 2,
    name: 'Lawnmower Dog',
    air_date: 'December 9, 2013',
    episode: 'S01E02',
    characters: [],
    url: 'https://rickandmortyapi.com/api/episode/2',
    created: '2017-11-10T12:56:33.916Z',
  };
  const episode3: RickAndMortyEpisode = {
    id: 3,
    name: 'Anatomy Park',
    air_date: 'December 16, 2013',
    episode: 'S01E03',
    characters: [],
    url: 'https://rickandmortyapi.com/api/episode/3',
    created: '2017-11-10T12:56:34.022Z',
  };
  const expectedListCharacter: CharacterResponseDto = {
    id: 1,
    name: 'Rick Sanchez',
    status: 'Alive',
    species: 'Human',
    type: '',
    gender: 'Male',
    image: 'https://rickandmortyapi.com/api/character/avatar/1.jpeg',
    originName: 'Earth (C-137)',
    locationName: 'Citadel of Ricks',
  };
  const expectedCharacterDetail: CharacterDetailResponseDto = {
    ...expectedListCharacter,
    episodes: [
      {
        id: 1,
        name: 'Pilot',
        episode: 'S01E01',
        airDate: 'December 2, 2013',
      },
    ],
  };
  const externalListPage1: RickAndMortyCharacterListResponse = {
    info: {
      count: 826,
      pages: 42,
      next: 'https://rickandmortyapi.com/api/character?page=2',
      prev: null,
    },
    results: [character],
  };
  const expectedListPage1: CharactersListResponseDto = {
    info: {
      count: 826,
      pages: 42,
      currentPage: 1,
      nextPage: 2,
      previousPage: null,
    },
    results: [expectedListCharacter],
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
      getCharactersByPage: jest.fn(),
      getCharacterById: jest.fn(),
      getEpisodesByIds: jest.fn(),
    };
    cacheService = {
      get: jest.fn(),
      set: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CharactersService,
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
              if (key === 'CHARACTERS_CACHE_TTL_SECONDS') {
                return 3600;
              }
              return defaultValue;
            }),
          },
        },
      ],
    }).compile();
    service = module.get<CharactersService>(CharactersService);
  });
  it('should be defined', () => {
    expect(service).toBeDefined();
  });
  describe('listCharacters', () => {
    it('should map paginated characters and metadata without external urls', async () => {
      cacheService.get.mockResolvedValue(undefined);
      rickAndMortyService.getCharactersByPage.mockResolvedValue(
        externalListPage1,
      );
      const result = await service.listCharacters({ page: 1 });
      expect(rickAndMortyService.getCharactersByPage).toHaveBeenCalledWith(
        1,
        undefined,
      );
      expect(result).toEqual(expectedListPage1);
      expect(result.results[0]).not.toHaveProperty('url');
      expect(result.results[0]).not.toHaveProperty('origin');
      expect(result.results[0]).not.toHaveProperty('location');
      expect(result.results[0]).not.toHaveProperty('episodes');
      expect(result.info).not.toHaveProperty('next');
      expect(result.info).not.toHaveProperty('prev');
      expect(rickAndMortyService.getEpisodesByIds).not.toHaveBeenCalled();
    });
    it('should map nextPage and previousPage for a middle page', async () => {
      cacheService.get.mockResolvedValue(undefined);
      rickAndMortyService.getCharactersByPage.mockResolvedValue({
        ...externalListPage1,
        info: {
          count: 826,
          pages: 42,
          next: 'https://rickandmortyapi.com/api/character?page=3',
          prev: 'https://rickandmortyapi.com/api/character?page=1',
        },
      });
      const result = await service.listCharacters({ page: 2 });
      expect(result.info).toEqual({
        count: 826,
        pages: 42,
        currentPage: 2,
        nextPage: 3,
        previousPage: 1,
      });
    });
    it('should apply name filter', async () => {
      cacheService.get.mockResolvedValue(undefined);
      rickAndMortyService.getCharactersByPage.mockResolvedValue({
        info: { count: 1, pages: 1, next: null, prev: null },
        results: [character],
      });
      await service.listCharacters({ page: 1, name: 'Rick' });
      expect(rickAndMortyService.getCharactersByPage).toHaveBeenCalledWith(1, {
        name: 'rick',
      });
      expect(cacheService.set).toHaveBeenCalledWith(
        'characters:list:v1:page:1:name:rick',
        expect.any(Object),
        3600,
      );
    });
    it('should apply status filter', async () => {
      cacheService.get.mockResolvedValue(undefined);
      rickAndMortyService.getCharactersByPage.mockResolvedValue({
        info: { count: 1, pages: 1, next: null, prev: null },
        results: [character],
      });
      await service.listCharacters({ page: 1, status: 'alive' });
      expect(rickAndMortyService.getCharactersByPage).toHaveBeenCalledWith(1, {
        status: 'alive',
      });
      expect(cacheService.set).toHaveBeenCalledWith(
        'characters:list:v1:page:1:status:alive',
        expect.any(Object),
        3600,
      );
    });
    it('should apply species filter', async () => {
      cacheService.get.mockResolvedValue(undefined);
      rickAndMortyService.getCharactersByPage.mockResolvedValue({
        info: { count: 1, pages: 1, next: null, prev: null },
        results: [character],
      });
      await service.listCharacters({ page: 1, species: 'Human' });
      expect(rickAndMortyService.getCharactersByPage).toHaveBeenCalledWith(1, {
        species: 'human',
      });
      expect(cacheService.set).toHaveBeenCalledWith(
        'characters:list:v1:page:1:species:human',
        expect.any(Object),
        3600,
      );
    });
    it('should apply type filter', async () => {
      cacheService.get.mockResolvedValue(undefined);
      rickAndMortyService.getCharactersByPage.mockResolvedValue({
        info: { count: 1, pages: 1, next: null, prev: null },
        results: [character],
      });
      await service.listCharacters({ page: 1, type: 'Parasitic' });
      expect(rickAndMortyService.getCharactersByPage).toHaveBeenCalledWith(1, {
        type: 'parasitic',
      });
      expect(cacheService.set).toHaveBeenCalledWith(
        'characters:list:v1:page:1:type:parasitic',
        expect.any(Object),
        3600,
      );
    });
    it('should apply gender filter', async () => {
      cacheService.get.mockResolvedValue(undefined);
      rickAndMortyService.getCharactersByPage.mockResolvedValue({
        info: { count: 1, pages: 1, next: null, prev: null },
        results: [character],
      });
      await service.listCharacters({ page: 1, gender: 'male' });
      expect(rickAndMortyService.getCharactersByPage).toHaveBeenCalledWith(1, {
        gender: 'male',
      });
      expect(cacheService.set).toHaveBeenCalledWith(
        'characters:list:v1:page:1:gender:male',
        expect.any(Object),
        3600,
      );
    });
    it('should apply combined filters', async () => {
      cacheService.get.mockResolvedValue(undefined);
      rickAndMortyService.getCharactersByPage.mockResolvedValue({
        info: { count: 1, pages: 1, next: null, prev: null },
        results: [character],
      });
      await service.listCharacters({
        page: 1,
        name: ' Rick ',
        status: 'Alive',
        species: ' Human ',
        type: ' Parasitic ',
        gender: 'Male',
      });
      expect(rickAndMortyService.getCharactersByPage).toHaveBeenCalledWith(1, {
        name: 'rick',
        status: 'alive',
        species: 'human',
        type: 'parasitic',
        gender: 'male',
      });
      expect(cacheService.set).toHaveBeenCalledWith(
        'characters:list:v1:page:1:name:rick:status:alive:species:human:type:parasitic:gender:male',
        expect.any(Object),
        3600,
      );
    });
    it('should map filtered search with no matches to empty results', async () => {
      cacheService.get.mockResolvedValue(undefined);
      rickAndMortyService.getCharactersByPage.mockRejectedValue(
        createNotFoundError(),
      );
      const result = await service.listCharacters({
        page: 1,
        name: 'xyz-no-match',
      });
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
      expect(cacheService.set).toHaveBeenCalledWith(
        'characters:list:v1:page:1:name:xyz-no-match',
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
    it('should throw NotFoundException when unfiltered page does not exist', async () => {
      cacheService.get.mockResolvedValue(undefined);
      rickAndMortyService.getCharactersByPage.mockRejectedValue(
        createNotFoundError(),
      );
      await expect(
        service.listCharacters({ page: 999 }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(cacheService.set).not.toHaveBeenCalled();
    });
    it('should throw BadGatewayException when integration fails', async () => {
      cacheService.get.mockResolvedValue(undefined);
      rickAndMortyService.getCharactersByPage.mockRejectedValue(
        new Error('network down'),
      );
      await expect(service.listCharacters({ page: 1 })).rejects.toBeInstanceOf(
        BadGatewayException,
      );
      expect(cacheService.set).not.toHaveBeenCalled();
    });
    it('should throw BadGatewayException when external response is invalid', async () => {
      cacheService.get.mockResolvedValue(undefined);
      rickAndMortyService.getCharactersByPage.mockResolvedValue({
        info: { count: 1, pages: 1, next: null, prev: null },
        results: [{ id: 'bad' }],
      } as unknown as RickAndMortyCharacterListResponse);
      await expect(service.listCharacters({ page: 1 })).rejects.toBeInstanceOf(
        BadGatewayException,
      );
      expect(cacheService.set).not.toHaveBeenCalled();
    });
    it('should return cached response on cache hit without calling external API', async () => {
      cacheService.get.mockResolvedValue(expectedListPage1);
      const result = await service.listCharacters({ page: 1 });
      expect(result).toEqual(expectedListPage1);
      expect(cacheService.get).toHaveBeenCalledWith(
        'characters:list:v1:page:1',
      );
      expect(rickAndMortyService.getCharactersByPage).not.toHaveBeenCalled();
      expect(cacheService.set).not.toHaveBeenCalled();
    });
    it('should fetch from API and store mapped response on cache miss', async () => {
      cacheService.get.mockResolvedValue(undefined);
      rickAndMortyService.getCharactersByPage.mockResolvedValue(
        externalListPage1,
      );
      const result = await service.listCharacters({ page: 1 });
      expect(result).toEqual(expectedListPage1);
      expect(cacheService.set).toHaveBeenCalledWith(
        'characters:list:v1:page:1',
        expectedListPage1,
        3600,
      );
    });
    it('should keep list cache keys separated by page and filters', async () => {
      cacheService.get.mockResolvedValue(undefined);
      rickAndMortyService.getCharactersByPage.mockResolvedValue(
        externalListPage1,
      );
      await service.listCharacters({ page: 1 });
      await service.listCharacters({ page: 2 });
      await service.listCharacters({ page: 1, name: 'rick' });
      await service.listCharacters({ page: 1, status: 'alive' });
      await service.listCharacters({
        page: 1,
        name: 'rick',
        status: 'alive',
      });
      expect(cacheService.set).toHaveBeenNthCalledWith(
        1,
        'characters:list:v1:page:1',
        expect.any(Object),
        3600,
      );
      expect(cacheService.set).toHaveBeenNthCalledWith(
        2,
        'characters:list:v1:page:2',
        expect.any(Object),
        3600,
      );
      expect(cacheService.set).toHaveBeenNthCalledWith(
        3,
        'characters:list:v1:page:1:name:rick',
        expect.any(Object),
        3600,
      );
      expect(cacheService.set).toHaveBeenNthCalledWith(
        4,
        'characters:list:v1:page:1:status:alive',
        expect.any(Object),
        3600,
      );
      expect(cacheService.set).toHaveBeenNthCalledWith(
        5,
        'characters:list:v1:page:1:name:rick:status:alive',
        expect.any(Object),
        3600,
      );
    });
    it('should fallback to external API when cache read returns empty', async () => {
      cacheService.get.mockResolvedValue(undefined);
      rickAndMortyService.getCharactersByPage.mockResolvedValue(
        externalListPage1,
      );
      const result = await service.listCharacters({ page: 1 });
      expect(result).toEqual(expectedListPage1);
      expect(rickAndMortyService.getCharactersByPage).toHaveBeenCalledWith(
        1,
        undefined,
      );
      expect(cacheService.set).toHaveBeenCalled();
    });
    it('should still return response after attempting cache write', async () => {
      cacheService.get.mockResolvedValue(undefined);
      cacheService.set.mockResolvedValue(undefined);
      rickAndMortyService.getCharactersByPage.mockResolvedValue(
        externalListPage1,
      );
      await expect(service.listCharacters({ page: 1 })).resolves.toEqual(
        expectedListPage1,
      );
      expect(cacheService.set).toHaveBeenCalled();
    });
  });
  describe('getCharacterById', () => {
    it('should map character detail with a single episode', async () => {
      cacheService.get.mockResolvedValue(undefined);
      rickAndMortyService.getCharacterById.mockResolvedValue(character);
      rickAndMortyService.getEpisodesByIds.mockResolvedValue([episode1]);
      const result = await service.getCharacterById(1);
      expect(rickAndMortyService.getCharacterById).toHaveBeenCalledWith(1);
      expect(rickAndMortyService.getEpisodesByIds).toHaveBeenCalledWith([1]);
      expect(result).toEqual(expectedCharacterDetail);
      expect(result).not.toHaveProperty('url');
      expect(result).not.toHaveProperty('origin');
      expect(result).not.toHaveProperty('location');
      expect(result).not.toHaveProperty('episode');
      expect(result.episodes[0]).not.toHaveProperty('url');
      expect(result.episodes[0]).not.toHaveProperty('characters');
    });
    it('should map character detail with multiple episodes in character order', async () => {
      cacheService.get.mockResolvedValue(undefined);
      rickAndMortyService.getCharacterById.mockResolvedValue({
        ...character,
        episode: [
          'https://rickandmortyapi.com/api/episode/3',
          'https://rickandmortyapi.com/api/episode/1',
          'https://rickandmortyapi.com/api/episode/2',
        ],
      });
      rickAndMortyService.getEpisodesByIds.mockResolvedValue([
        episode1,
        episode2,
        episode3,
      ]);
      const result = await service.getCharacterById(1);
      expect(rickAndMortyService.getEpisodesByIds).toHaveBeenCalledWith([
        3, 1, 2,
      ]);
      expect(result.episodes).toEqual([
        {
          id: 3,
          name: 'Anatomy Park',
          episode: 'S01E03',
          airDate: 'December 16, 2013',
        },
        {
          id: 1,
          name: 'Pilot',
          episode: 'S01E01',
          airDate: 'December 2, 2013',
        },
        {
          id: 2,
          name: 'Lawnmower Dog',
          episode: 'S01E02',
          airDate: 'December 9, 2013',
        },
      ]);
    });
    it('should restore character episode order when batch response is shuffled', async () => {
      cacheService.get.mockResolvedValue(undefined);
      rickAndMortyService.getCharacterById.mockResolvedValue({
        ...character,
        episode: [
          'https://rickandmortyapi.com/api/episode/1',
          'https://rickandmortyapi.com/api/episode/2',
          'https://rickandmortyapi.com/api/episode/3',
        ],
      });
      rickAndMortyService.getEpisodesByIds.mockResolvedValue([
        episode3,
        episode1,
        episode2,
      ]);
      const result = await service.getCharacterById(1);
      expect(result.episodes.map((episode) => episode.id)).toEqual([1, 2, 3]);
    });
    it('should remove duplicate episode ids keeping the first occurrence', async () => {
      cacheService.get.mockResolvedValue(undefined);
      rickAndMortyService.getCharacterById.mockResolvedValue({
        ...character,
        episode: [
          'https://rickandmortyapi.com/api/episode/2',
          'https://rickandmortyapi.com/api/episode/1',
          'https://rickandmortyapi.com/api/episode/2',
          'https://rickandmortyapi.com/api/episode/3',
          'https://rickandmortyapi.com/api/episode/1',
        ],
      });
      rickAndMortyService.getEpisodesByIds.mockResolvedValue([
        episode1,
        episode2,
        episode3,
      ]);
      const result = await service.getCharacterById(1);
      expect(rickAndMortyService.getEpisodesByIds).toHaveBeenCalledWith([
        2, 1, 3,
      ]);
      expect(result.episodes.map((episode) => episode.id)).toEqual([2, 1, 3]);
    });
    it('should return empty episodes without batch fetch when character has none', async () => {
      cacheService.get.mockResolvedValue(undefined);
      rickAndMortyService.getCharacterById.mockResolvedValue({
        ...character,
        episode: [],
      });
      const result = await service.getCharacterById(1);
      expect(result.episodes).toEqual([]);
      expect(rickAndMortyService.getEpisodesByIds).not.toHaveBeenCalled();
      expect(cacheService.set).toHaveBeenCalledWith(
        'characters:detail:v2:id:1',
        {
          ...expectedListCharacter,
          episodes: [],
        },
        3600,
      );
    });
    it('should throw NotFoundException when character does not exist', async () => {
      cacheService.get.mockResolvedValue(undefined);
      rickAndMortyService.getCharacterById.mockRejectedValue(
        createNotFoundError(),
      );
      await expect(service.getCharacterById(9999)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(rickAndMortyService.getEpisodesByIds).not.toHaveBeenCalled();
      expect(cacheService.set).not.toHaveBeenCalled();
    });
    it('should throw BadGatewayException when character integration fails', async () => {
      cacheService.get.mockResolvedValue(undefined);
      rickAndMortyService.getCharacterById.mockRejectedValue(
        new Error('network down'),
      );
      await expect(service.getCharacterById(1)).rejects.toBeInstanceOf(
        BadGatewayException,
      );
      expect(rickAndMortyService.getEpisodesByIds).not.toHaveBeenCalled();
      expect(cacheService.set).not.toHaveBeenCalled();
    });
    it('should throw BadGatewayException when character response is invalid', async () => {
      cacheService.get.mockResolvedValue(undefined);
      rickAndMortyService.getCharacterById.mockResolvedValue({
        id: 'bad',
      } as unknown as RickAndMortyCharacter);
      await expect(service.getCharacterById(1)).rejects.toBeInstanceOf(
        BadGatewayException,
      );
      expect(rickAndMortyService.getEpisodesByIds).not.toHaveBeenCalled();
      expect(cacheService.set).not.toHaveBeenCalled();
    });
    it('should throw BadGatewayException when episode batch fails', async () => {
      cacheService.get.mockResolvedValue(undefined);
      rickAndMortyService.getCharacterById.mockResolvedValue(character);
      rickAndMortyService.getEpisodesByIds.mockRejectedValue(
        new Error('network down'),
      );
      await expect(service.getCharacterById(1)).rejects.toBeInstanceOf(
        BadGatewayException,
      );
      expect(cacheService.set).not.toHaveBeenCalled();
    });
    it('should throw BadGatewayException when episode batch response is invalid', async () => {
      cacheService.get.mockResolvedValue(undefined);
      rickAndMortyService.getCharacterById.mockResolvedValue(character);
      rickAndMortyService.getEpisodesByIds.mockResolvedValue([
        { id: 'bad' } as unknown as RickAndMortyEpisode,
      ]);
      await expect(service.getCharacterById(1)).rejects.toBeInstanceOf(
        BadGatewayException,
      );
      expect(cacheService.set).not.toHaveBeenCalled();
    });
    it('should throw BadGatewayException when episode batch misses an id', async () => {
      cacheService.get.mockResolvedValue(undefined);
      rickAndMortyService.getCharacterById.mockResolvedValue({
        ...character,
        episode: [
          'https://rickandmortyapi.com/api/episode/1',
          'https://rickandmortyapi.com/api/episode/2',
        ],
      });
      rickAndMortyService.getEpisodesByIds.mockResolvedValue([episode1]);
      await expect(service.getCharacterById(1)).rejects.toBeInstanceOf(
        BadGatewayException,
      );
      expect(cacheService.set).not.toHaveBeenCalled();
    });
    it('should return cached response on cache hit without calling external API', async () => {
      cacheService.get.mockResolvedValue(expectedCharacterDetail);
      const result = await service.getCharacterById(1);
      expect(result).toEqual(expectedCharacterDetail);
      expect(cacheService.get).toHaveBeenCalledWith(
        'characters:detail:v2:id:1',
      );
      expect(rickAndMortyService.getCharacterById).not.toHaveBeenCalled();
      expect(rickAndMortyService.getEpisodesByIds).not.toHaveBeenCalled();
      expect(cacheService.set).not.toHaveBeenCalled();
    });
    it('should fetch from API and store complete response on cache miss', async () => {
      cacheService.get.mockResolvedValue(undefined);
      rickAndMortyService.getCharacterById.mockResolvedValue(character);
      rickAndMortyService.getEpisodesByIds.mockResolvedValue([episode1]);
      const result = await service.getCharacterById(1);
      expect(result).toEqual(expectedCharacterDetail);
      expect(cacheService.set).toHaveBeenCalledWith(
        'characters:detail:v2:id:1',
        expectedCharacterDetail,
        3600,
      );
    });
    it('should keep detail cache keys separated by id using v2', async () => {
      cacheService.get.mockResolvedValue(undefined);
      rickAndMortyService.getCharacterById.mockResolvedValue(character);
      rickAndMortyService.getEpisodesByIds.mockResolvedValue([episode1]);
      await service.getCharacterById(1);
      await service.getCharacterById(2);
      expect(cacheService.set).toHaveBeenNthCalledWith(
        1,
        'characters:detail:v2:id:1',
        expect.any(Object),
        3600,
      );
      expect(cacheService.set).toHaveBeenNthCalledWith(
        2,
        'characters:detail:v2:id:2',
        expect.any(Object),
        3600,
      );
    });
    it('should fallback to external API when cache read returns empty', async () => {
      cacheService.get.mockResolvedValue(undefined);
      rickAndMortyService.getCharacterById.mockResolvedValue(character);
      rickAndMortyService.getEpisodesByIds.mockResolvedValue([episode1]);
      const result = await service.getCharacterById(1);
      expect(result).toEqual(expectedCharacterDetail);
      expect(rickAndMortyService.getCharacterById).toHaveBeenCalledWith(1);
      expect(rickAndMortyService.getEpisodesByIds).toHaveBeenCalledWith([1]);
      expect(cacheService.set).toHaveBeenCalled();
    });
    it('should still return response after attempting cache write', async () => {
      cacheService.get.mockResolvedValue(undefined);
      cacheService.set.mockResolvedValue(undefined);
      rickAndMortyService.getCharacterById.mockResolvedValue(character);
      rickAndMortyService.getEpisodesByIds.mockResolvedValue([episode1]);
      await expect(service.getCharacterById(1)).resolves.toEqual(
        expectedCharacterDetail,
      );
      expect(cacheService.set).toHaveBeenCalled();
    });
  });
});
