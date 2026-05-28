import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import { apiKeys, env } from "../utils/env.js";
import { AuthError } from "../utils/errors.js";
import { logger } from "../utils/logger.js";

export interface Actor {
  id: string;
  method: "api_key" | "clerk" | "supabase";
  scopes: string[];
}

let clerkJwks: ReturnType<typeof createRemoteJWKSet> | null = null;
let supabaseJwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getClerkJwks() {
  if (!env.CLERK_JWKS_URL) return null;
  if (!clerkJwks) clerkJwks = createRemoteJWKSet(new URL(env.CLERK_JWKS_URL));
  return clerkJwks;
}

function getSupabaseJwks() {
  if (!env.SUPABASE_JWKS_URL) return null;
  if (!supabaseJwks) supabaseJwks = createRemoteJWKSet(new URL(env.SUPABASE_JWKS_URL));
  return supabaseJwks;
}

function extractBearer(headerValue: string | undefined | null): string | null {
  if (!headerValue) return null;
  const match = /^Bearer\s+(.+)$/i.exec(headerValue.trim());
  return match?.[1] ?? null;
}

async function verifyJwt(
  token: string,
  jwks: ReturnType<typeof createRemoteJWKSet>,
  issuer: string | undefined,
  method: "clerk" | "supabase",
): Promise<Actor | null> {
  try {
    const { payload } = await jwtVerify(token, jwks, issuer ? { issuer } : undefined);
    const sub = (payload as JWTPayload).sub;
    if (!sub) return null;
    return { id: sub, method, scopes: ["tools:*"] };
  } catch (err) {
    logger.debug({ err, method }, "jwt verification failed");
    return null;
  }
}

/**
 * Resolve the caller from an Authorization header. Tries static API keys first,
 * then Clerk, then Supabase. Throws AuthError when nothing matches.
 */
export async function authenticate(authorization: string | undefined | null): Promise<Actor> {
  const token = extractBearer(authorization);
  if (!token) throw new AuthError("Missing or malformed Authorization header.");

  if (apiKeys.includes(token)) {
    return { id: `key:${token.slice(0, 6)}`, method: "api_key", scopes: ["tools:*"] };
  }

  const clerk = getClerkJwks();
  if (clerk) {
    const actor = await verifyJwt(token, clerk, env.CLERK_ISSUER, "clerk");
    if (actor) return actor;
  }

  const supabase = getSupabaseJwks();
  if (supabase) {
    const actor = await verifyJwt(token, supabase, env.SUPABASE_JWT_ISSUER, "supabase");
    if (actor) return actor;
  }

  throw new AuthError("Invalid credentials.");
}

export function authConfigured(): boolean {
  return apiKeys.length > 0 || Boolean(env.CLERK_JWKS_URL) || Boolean(env.SUPABASE_JWKS_URL);
}
