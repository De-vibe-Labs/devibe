import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";
import { env } from "../utils/env.js";
import { logger } from "../utils/logger.js";
import { ConfigError } from "../utils/errors.js";
import * as schema from "./schema.js";

let pool: pg.Pool | null = null;
let database: NodePgDatabase<typeof schema> | null = null;

/** Lazily construct the pool so the process can boot without a DB (e.g. tests). */
export function getDb(): NodePgDatabase<typeof schema> {
  if (database) return database;
  if (!env.DATABASE_URL) {
    throw new ConfigError("DATABASE_URL is not configured — persistence is unavailable.");
  }
  pool = new pg.Pool({
    connectionString: env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30_000,
  });
  pool.on("error", (err) => logger.error({ err }, "postgres pool error"));
  database = drizzle(pool, { schema });
  return database;
}

export function isDbConfigured(): boolean {
  return Boolean(env.DATABASE_URL);
}

export async function pingDb(): Promise<boolean> {
  if (!isDbConfigured()) return false;
  try {
    const db = getDb();
    await db.execute("select 1");
    return true;
  } catch (err) {
    logger.warn({ err }, "db ping failed");
    return false;
  }
}

export async function closeDb(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    database = null;
  }
}

export { schema };
