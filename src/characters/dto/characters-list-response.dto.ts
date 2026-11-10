import { CharacterResponseDto } from './character-response.dto';
export class CharactersListInfoDto {
  count!: number;
  pages!: number;
  currentPage!: number;
  nextPage!: number | null;
  previousPage!: number | null;
}
export class CharactersListResponseDto {
  info!: CharactersListInfoDto;
  results!: CharacterResponseDto[];
}
