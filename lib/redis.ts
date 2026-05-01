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

  async get(key: string) {
    const data = await this.client.get(key);
    return data ? JSON.parse(data as string) : null;
  }

  async set(key: string, value: any, duration?: number) {
    const stringValue = JSON.stringify(value);

    if (duration !== undefined) {
      await this.client.set(key, stringValue, { ex: duration });
    } else {
      await this.client.set(key, stringValue);
    }
  }

  async del(key: string) {
    await this.client.del(key);
  }
}

const redisClient = new RedisClient();
export default redisClient;