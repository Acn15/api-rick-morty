import { Controller, Get, Param, Query } from '@nestjs/common';
import { CharactersService } from './characters.service';
import { CharacterDetailResponseDto } from './dto/character-detail-response.dto';
import { CharacterIdParamDto } from './dto/character-id.param';
import { CharactersListResponseDto } from './dto/characters-list-response.dto';
import { ListCharactersQueryDto } from './dto/list-characters-query.dto';
@Controller('characters')
export class CharactersController {
  constructor(private readonly charactersService: CharactersService) {}
  @Get()
  listCharacters(
    @Query()
    query: ListCharactersQueryDto,
  ): Promise<CharactersListResponseDto> {
    return this.charactersService.listCharacters({
      page: query.page ?? 1,
      name: query.name,
      status: query.status,
      species: query.species,
      type: query.type,
      gender: query.gender,
    });
  }
  @Get(':id')
  getCharacterById(
    @Param()
    params: CharacterIdParamDto,
  ): Promise<CharacterDetailResponseDto> {
    return this.charactersService.getCharacterById(params.id);
  }
}
