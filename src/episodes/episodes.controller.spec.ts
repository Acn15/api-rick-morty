import { Test, TestingModule } from '@nestjs/testing';
import { EpisodesController } from './episodes.controller';
import { EpisodesService } from './episodes.service';
describe('EpisodesController', () => {
  let controller: EpisodesController;
  let episodesService: {
    listEpisodes: jest.Mock;
    getEpisodeCharacters: jest.Mock;
  };
  beforeEach(async () => {
    episodesService = {
      listEpisodes: jest.fn(),
      getEpisodeCharacters: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EpisodesController],
      providers: [
        {
          provide: EpisodesService,
          useValue: episodesService,
        },
      ],
    }).compile();
    controller = module.get<EpisodesController>(EpisodesController);
  });
  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
  it('should delegate listEpisodes to the service with provided page', async () => {
    const response = {
      info: {
        count: 51,
        pages: 3,
        currentPage: 2,
        nextPage: 3,
        previousPage: 1,
      },
      results: [],
    };
    episodesService.listEpisodes.mockResolvedValue(response);
    await expect(controller.listEpisodes({ page: 2 })).resolves.toEqual(
      response,
    );
    expect(episodesService.listEpisodes).toHaveBeenCalledWith(2, undefined);
  });
  it('should default listEpisodes page to 1 when omitted', async () => {
    const response = {
      info: {
        count: 51,
        pages: 3,
        currentPage: 1,
        nextPage: 2,
        previousPage: null,
      },
      results: [],
    };
    episodesService.listEpisodes.mockResolvedValue(response);
    await expect(controller.listEpisodes({})).resolves.toEqual(response);
    expect(episodesService.listEpisodes).toHaveBeenCalledWith(1, undefined);
  });
  it('should forward optional search to the service', async () => {
    const response = {
      info: {
        count: 1,
        pages: 1,
        currentPage: 1,
        nextPage: null,
        previousPage: null,
      },
      results: [],
    };
    episodesService.listEpisodes.mockResolvedValue(response);
    await expect(
      controller.listEpisodes({ page: 1, search: 'Pilot' }),
    ).resolves.toEqual(response);
    expect(episodesService.listEpisodes).toHaveBeenCalledWith(1, 'Pilot');
  });
  it('should default page to 1 when numeric search omits page (DTO strips it)', async () => {
    const response = {
      info: {
        count: 1,
        pages: 1,
        currentPage: 1,
        nextPage: null,
        previousPage: null,
      },
      results: [],
    };
    episodesService.listEpisodes.mockResolvedValue(response);
    await expect(controller.listEpisodes({ search: '1' })).resolves.toEqual(
      response,
    );
    expect(episodesService.listEpisodes).toHaveBeenCalledWith(1, '1');
  });
  it('should delegate getEpisodeCharacters to the service', async () => {
    const response = {
      id: 1,
      name: 'Pilot',
      airDate: 'December 2, 2013',
      episode: 'S01E01',
      characters: [],
    };
    episodesService.getEpisodeCharacters.mockResolvedValue(response);
    await expect(controller.getEpisodeCharacters({ id: 1 })).resolves.toEqual(
      response,
    );
    expect(episodesService.getEpisodeCharacters).toHaveBeenCalledWith(1);
  });
});
