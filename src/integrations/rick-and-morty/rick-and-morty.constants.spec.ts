import {
  createRickAndMortyHttpConfig,
  RICK_AND_MORTY_HTTP_TIMEOUT_MS,
} from './rick-and-morty.constants';
describe('rick-and-morty.constants', () => {
  it('should expose a finite timeout between 5 and 10 seconds', () => {
    expect(RICK_AND_MORTY_HTTP_TIMEOUT_MS).toBeGreaterThanOrEqual(5000);
    expect(RICK_AND_MORTY_HTTP_TIMEOUT_MS).toBeLessThanOrEqual(10000);
  });
  it('should centralize baseURL and timeout for the HTTP client', () => {
    expect(
      createRickAndMortyHttpConfig('https://rickandmortyapi.com/api'),
    ).toEqual({
      baseURL: 'https://rickandmortyapi.com/api',
      timeout: RICK_AND_MORTY_HTTP_TIMEOUT_MS,
    });
  });
});
