import Redis from 'ioredis';
import { config } from './config';

let client: Redis | null = null;

export function getRedisClient(): Redis {
  if (!client) {
    client = new Redis(config.redis.url, {
      lazyConnect: true,
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 5) {
          console.error('[redis] Maximum retry attempts reached, giving up.');
          return null;
        }
        const delay = Math.min(times * 200, 2000);
        console.warn(`[redis] Retrying connection in ${delay}ms (attempt ${times})`);
        return delay;
      },
    });

    client.on('connect', () => console.info('[redis] Connected'));
    client.on('error', (err) => console.error('[redis] Error:', err.message));
  }
  return client;
}

export async function closeRedisClient(): Promise<void> {
  if (client) {
    await client.quit();
    client = null;
  }
}
