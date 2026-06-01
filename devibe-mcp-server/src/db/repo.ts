import { getDb, isDbConfigured } from "./client.js";
import { auditLogs } from "./schema.js";
import { newAuditId } from "../utils/ids.js";
import { logger } from "../utils/logger.js";

/**
 * Persistence helpers used by tools. When DATABASE_URL is absent the helpers
 * degrade to no-ops so planning tools still work in stateless environments.
 */

export async function recordAudit(entry: {
  actorId?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  if (!isDbConfigured()) return;
  try {
    await getDb()
      .insert(auditLogs)
      .values({
        id: newAuditId(),
        actorId: entry.actorId ?? null,
        action: entry.action,
        resourceType: entry.resourceType,
        resourceId: entry.resourceId ?? null,
        metadata: entry.metadata ?? null,
      });
  } catch (err) {
    // Audit failures must never break a tool call.
    logger.warn({ err, action: entry.action }, "failed to record audit log");
  }
}

/** Run a function with the DB, returning null if persistence is unavailable. */
export async function withDb<T>(fn: (db: ReturnType<typeof getDb>) => Promise<T>): Promise<T | null> {
  if (!isDbConfigured()) return null;
  try {
    return await fn(getDb());
  } catch (err) {
    logger.error({ err }, "database operation failed");
    throw err;
  }
}
