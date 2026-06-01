import { Redis } from "ioredis";
import { env } from "../utils/env.js";

let connection: Redis | null = null;

export function isQueueConfigured(): boolean {
  return Boolean(env.REDIS_URL);
}

/** Shared ioredis connection for BullMQ (queues + workers). */
export function getRedis(): Redis {
  if (!env.REDIS_URL) throw new Error("REDIS_URL is not configured — background jobs are disabled.");
  if (!connection) {
    connection = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
  }
  return connection;
}

export async function closeRedis(): Promise<void> {
  if (connection) {
    await connection.quit();
    connection = null;
  }
}
