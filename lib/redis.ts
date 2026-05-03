import { Redis } from "@upstash/redis";

class RedisClient {
  private client: Redis;
  private clientConnected: boolean;

  constructor() {
    this.client = Redis.fromEnv();
    this.clientConnected = true;
  }

  isAlive() {
    return this.clientConnected;
  }

  // ✅ NO JSON.parse
  async get<T = any>(key: string): Promise<T | null> {
    const data = await this.client.get(key);
    return data as T | null;
  }

  // ✅ NO JSON.stringify
  async set(key: string, value: any, duration?: number) {
    if (duration !== undefined) {
      await this.client.set(key, value, { ex: duration });
    } else {
      await this.client.set(key, value);
    }
  }

  async del(key: string) {
    await this.client.del(key);
  }
}

const redisClient = new RedisClient();
export default redisClient;