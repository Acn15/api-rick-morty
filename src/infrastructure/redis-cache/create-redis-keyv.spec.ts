import { createRedisKeyv } from './create-redis-keyv';
function isNestKeyvInstance(store: object) {
  return (
    'opts' in store &&
    'hooks' in store &&
    'stats' in store &&
    typeof (
      store as {
        get: unknown;
      }
    ).get === 'function' &&
    typeof (
      store as {
        set: unknown;
      }
    ).set === 'function' &&
    typeof (
      store as {
        delete: unknown;
      }
    ).delete === 'function' &&
    typeof (
      store as {
        clear: unknown;
      }
    ).clear === 'function' &&
    typeof (
      store as {
        disconnect: unknown;
      }
    ).disconnect === 'function'
  );
}
describe('createRedisKeyv', () => {
  it('should satisfy NestJS Keyv instance detection', () => {
    const keyv = createRedisKeyv('redis://127.0.0.1:6379');
    expect(isNestKeyvInstance(keyv)).toBe(true);
    expect(keyv.throwOnEmptyListeners).toBe(false);
  });
  it('should not crash the process when an error is emitted without listeners', () => {
    const keyv = createRedisKeyv('redis://127.0.0.1:6379');
    expect(() => {
      keyv.emit('error', new Error('Socket closed unexpectedly'));
    }).not.toThrow();
  });
  it('should allow an error listener to observe disconnect errors', () => {
    const keyv = createRedisKeyv('redis://127.0.0.1:6379');
    const onError = jest.fn();
    keyv.on('error', onError);
    keyv.emit('error', new Error('Socket closed unexpectedly'));
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Socket closed unexpectedly' }),
    );
  });
});
