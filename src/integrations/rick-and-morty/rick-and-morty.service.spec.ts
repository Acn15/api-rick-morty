import { HttpService } from '@nestjs/axios';
import { Test, TestingModule } from '@nestjs/testing';
import { of } from 'rxjs';
import { RickAndMortyService } from './rick-and-morty.service';
describe('RickAndMortyService', () => {
  let service: RickAndMortyService;
  let httpService: {
    get: jest.Mock;
  };
  beforeEach(async () => {
    httpService = {
      get: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RickAndMortyService,
        {
          provide: HttpService,
          useValue: httpService,
        },
      ],
    }).compile();
    service = module.get<RickAndMortyService>(RickAndMortyService);
  });
  it('should be defined', () => {
    expect(service).toBeDefined();
  });
  it('should request paginated episodes by page query', async () => {
    const data = {
      info: { count: 51, pages: 3, next: null, prev: null },
      results: [],
    };
    httpService.get.mockReturnValue(of({ data }));
    await expect(service.getEpisodesByPage(2)).resolves.toEqual(data);
    expect(httpService.get).toHaveBeenCalledWith('/episode', {
      params: { page: 2 },
    });
  });
  it('should request episodes by name filter without concatenating the URL', async () => {
    const data = {
      info: { count: 1, pages: 1, next: null, prev: null },
      results: [],
    };
    httpService.get.mockReturnValue(of({ data }));
    await expect(service.getEpisodesByPage(1, 'Pilot')).resolves.toEqual(data);
    expect(httpService.get).toHaveBeenCalledWith('/episode', {
      params: { page: 1, name: 'Pilot' },
    });
  });
  it('should request episode by id', async () => {
    const data = { id: 1, name: 'Pilot' };
    httpService.get.mockReturnValue(of({ data }));
    await expect(service.getEpisodeById(1)).resolves.toEqual(data);
    expect(httpService.get).toHaveBeenCalledWith('/episode/1');
  });
  it('should request characters by ids and normalize single result', async () => {
    const character = { id: 1, name: 'Rick Sanchez' };
    httpService.get.mockReturnValue(of({ data: character }));
    await expect(service.getCharactersByIds([1])).resolves.toEqual([character]);
    expect(httpService.get).toHaveBeenCalledWith('/character/1');
  });
  it('should return empty array when character ids are empty', async () => {
    await expect(service.getCharactersByIds([])).resolves.toEqual([]);
    expect(httpService.get).not.toHaveBeenCalled();
  });
  it('should request episodes by ids and normalize single result', async () => {
    const episode = { id: 1, name: 'Pilot' };
    httpService.get.mockReturnValue(of({ data: episode }));
    await expect(service.getEpisodesByIds([1])).resolves.toEqual([episode]);
    expect(httpService.get).toHaveBeenCalledWith('/episode/1');
  });
  it('should request multiple episodes by ids without normalizing away the array', async () => {
    const episodes = [
      { id: 1, name: 'Pilot' },
      { id: 2, name: 'Lawnmower Dog' },
    ];
    httpService.get.mockReturnValue(of({ data: episodes }));
    await expect(service.getEpisodesByIds([1, 2])).resolves.toEqual(episodes);
    expect(httpService.get).toHaveBeenCalledWith('/episode/1,2');
  });
  it('should return empty array when episode ids are empty', async () => {
    await expect(service.getEpisodesByIds([])).resolves.toEqual([]);
    expect(httpService.get).not.toHaveBeenCalled();
  });
  it('should request paginated characters by page query', async () => {
    const data = {
      info: { count: 826, pages: 42, next: null, prev: null },
      results: [],
    };
    httpService.get.mockReturnValue(of({ data }));
    await expect(service.getCharactersByPage(2)).resolves.toEqual(data);
    expect(httpService.get).toHaveBeenCalledWith('/character', {
      params: { page: 2 },
    });
  });
  it('should request characters with combined filters without concatenating the URL', async () => {
    const data = {
      info: { count: 1, pages: 1, next: null, prev: null },
      results: [],
    };
    httpService.get.mockReturnValue(of({ data }));
    await expect(
      service.getCharactersByPage(1, {
        name: 'rick',
        status: 'alive',
        species: 'human',
        type: 'parasitic',
        gender: 'male',
      }),
    ).resolves.toEqual(data);
    expect(httpService.get).toHaveBeenCalledWith('/character', {
      params: {
        page: 1,
        name: 'rick',
        status: 'alive',
        species: 'human',
        type: 'parasitic',
        gender: 'male',
      },
    });
  });
  it('should request character by id', async () => {
    const data = { id: 1, name: 'Rick Sanchez' };
    httpService.get.mockReturnValue(of({ data }));
    await expect(service.getCharacterById(1)).resolves.toEqual(data);
    expect(httpService.get).toHaveBeenCalledWith('/character/1');
  });
});
