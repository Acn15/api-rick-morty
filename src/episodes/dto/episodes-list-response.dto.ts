export class EpisodeSummaryResponseDto {
  id!: number;
  name!: string;
  airDate!: string;
  episode!: string;
}
export class EpisodesListInfoDto {
  count!: number;
  pages!: number;
  currentPage!: number;
  nextPage!: number | null;
  previousPage!: number | null;
}
export class EpisodesListResponseDto {
  info!: EpisodesListInfoDto;
  results!: EpisodeSummaryResponseDto[];
}
