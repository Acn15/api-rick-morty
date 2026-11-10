export class CharacterEpisodeSummaryDto {
  id!: number;
  name!: string;
  episode!: string;
  airDate!: string;
}
export class CharacterDetailResponseDto {
  id!: number;
  name!: string;
  status!: string;
  species!: string;
  type!: string;
  gender!: string;
  image!: string;
  originName!: string;
  locationName!: string;
  episodes!: CharacterEpisodeSummaryDto[];
}
