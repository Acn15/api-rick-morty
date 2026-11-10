export class EpisodeCharacterResponseDto {
  id!: number;
  name!: string;
  status!: string;
  species!: string;
  type!: string;
  gender!: string;
  image!: string;
  originName!: string;
  locationName!: string;
}
export class EpisodeCharactersResponseDto {
  id!: number;
  name!: string;
  airDate!: string;
  episode!: string;
  characters!: EpisodeCharacterResponseDto[];
}
