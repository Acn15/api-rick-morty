import { Test, TestingModule } from '@nestjs/testing';
import { CharactersController } from './characters.controller';
import { CharactersService } from './characters.service';
describe('CharactersController', () => {
  let controller: CharactersController;
  let charactersService: {
    listCharacters: jest.Mock;
    getCharacterById: jest.Mock;
  };
  beforeEach(async () => {
    charactersService = {
      listCharacters: jest.fn(),
      getCharacterById: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CharactersController],
      providers: [
        {
          provide: CharactersService,
          useValue: charactersService,
        },
      ],
    }).compile();
    controller = module.get<CharactersController>(CharactersController);
  });
  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
  it('should delegate listCharacters with provided page and filters', async () => {
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
    charactersService.listCharacters.mockResolvedValue(response);
    await expect(
      controller.listCharacters({
        page: 1,
        name: 'rick',
        status: 'alive' as never,
        species: 'human',
        type: 'parasitic',
        gender: 'male' as never,
      }),
    ).resolves.toEqual(response);
    expect(charactersService.listCharacters).toHaveBeenCalledWith({
      page: 1,
      name: 'rick',
      status: 'alive',
      species: 'human',
      type: 'parasitic',
      gender: 'male',
    });
  });
  it('should default listCharacters page to 1 when omitted', async () => {
    const response = {
      info: {
        count: 826,
        pages: 42,
        currentPage: 1,
        nextPage: 2,
        previousPage: null,
      },
      results: [],
    };
    charactersService.listCharacters.mockResolvedValue(response);
    await expect(controller.listCharacters({})).resolves.toEqual(response);
    expect(charactersService.listCharacters).toHaveBeenCalledWith({
      page: 1,
      name: undefined,
      status: undefined,
      species: undefined,
      type: undefined,
      gender: undefined,
    });
  });
  it('should delegate getCharacterById to the service', async () => {
    const response = {
      id: 1,
      name: 'Rick Sanchez',
      status: 'Alive',
      species: 'Human',
      type: '',
      gender: 'Male',
      image: '',
      originName: 'Earth',
      locationName: 'Citadel of Ricks',
      episodes: [
        {
          id: 1,
          name: 'Pilot',
          episode: 'S01E01',
          airDate: 'December 2, 2013',
        },
      ],
    };
    charactersService.getCharacterById.mockResolvedValue(response);
    await expect(controller.getCharacterById({ id: 1 })).resolves.toEqual(
      response,
    );
    expect(charactersService.getCharacterById).toHaveBeenCalledWith(1);
  });
});
