export const RICK_AND_MORTY_HTTP_TIMEOUT_MS = 8000;
export function createRickAndMortyHttpConfig(baseURL: string): {
  baseURL: string;
  timeout: number;
} {
  return {
    baseURL,
    timeout: RICK_AND_MORTY_HTTP_TIMEOUT_MS,
  };
}
