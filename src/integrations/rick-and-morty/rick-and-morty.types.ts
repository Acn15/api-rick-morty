export interface RickAndMortyEpisode {
  id: number;
  name: string;
  air_date: string;
  episode: string;
  characters: string[];
  url: string;
  created: string;
}
export interface RickAndMortyPaginatedInfo {
  count: number;
  pages: number;
  next: string | null;
  prev: string | null;
}
export interface RickAndMortyEpisodeListResponse {
  info: RickAndMortyPaginatedInfo;
  results: RickAndMortyEpisode[];
}
export interface RickAndMortyCharacter {
  id: number;
  name: string;
  status: string;
  species: string;
  type: string;
  gender: string;
  origin: {
    name: string;
    url: string;
  };
  location: {
    name: string;
    url: string;
  };
  image: string;
  episode: string[];
  url: string;
  created: string;
}
export interface RickAndMortyCharacterFilters {
  name?: string;
  status?: string;
  species?: string;
  type?: string;
  gender?: string;
}
export interface RickAndMortyCharacterListResponse {
  info: RickAndMortyPaginatedInfo;
  results: RickAndMortyCharacter[];
}
