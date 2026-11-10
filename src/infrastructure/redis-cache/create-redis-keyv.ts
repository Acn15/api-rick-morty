import { createKeyvNonBlocking } from '@keyv/redis';
import type Keyv from 'keyv';
type RedisKeyv = Keyv & {
  throwOnEmptyListeners: boolean;
};
export function createRedisKeyv(redisUrl: string): RedisKeyv {
  const keyv = createKeyvNonBlocking(redisUrl) as RedisKeyv;
  Object.defineProperty(keyv, 'opts', {
    value: {},
    enumerable: true,
    configurable: true,
  });
  keyv.throwOnEmptyListeners = false;
  return keyv;
}
