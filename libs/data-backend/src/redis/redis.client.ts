import { createClient, RedisClientType } from 'redis';

let redisClient: RedisClientType | null = null;

export async function getRedisClient(): Promise<RedisClientType> {
  if (redisClient && redisClient.isOpen) {
    return redisClient;
  }

  const host = process.env['REDIS_HOST'] || 'localhost';
  const port = parseInt(process.env['REDIS_PORT'] || '6379', 10);
  const password = process.env['REDIS_PASSWORD'];

  redisClient = createClient({
    socket: {
      host,
      port,
    },
    password,
  });

  redisClient.on('error', (err) => {
    console.error('Redis Client Error:', err);
  });

  redisClient.on('connect', () => {
    console.log(`Redis connected to ${host}:${port}`);
  });

  redisClient.on('disconnect', () => {
    console.warn('Redis disconnected');
  });

  await redisClient.connect();

  return redisClient;
}

export async function closeRedisClient(): Promise<void> {
  if (redisClient && redisClient.isOpen) {
    await redisClient.quit();
    redisClient = null;
  }
}

export type { RedisClientType };
