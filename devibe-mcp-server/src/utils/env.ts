import { config } from "dotenv";
import { z } from "zod";

config();

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(8787),
  LOG_LEVEL: z.string().default("info"),

  DEVIBE_API_KEYS: z.string().default(""),

  CLERK_JWKS_URL: z.string().url().optional().or(z.literal("")),
  CLERK_ISSUER: z.string().optional(),
  SUPABASE_JWKS_URL: z.string().url().optional().or(z.literal("")),
  SUPABASE_JWT_ISSUER: z.string().optional(),

  DATABASE_URL: z.string().optional(),
  REDIS_URL: z.string().optional(),

  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default("gemini-2.5-flash"),

  GITHUB_TOKEN: z.string().optional(),
  GITHUB_API_URL: z.string().default("https://api.github.com"),

  STRIPE_SECRET_KEY: z.string().optional(),

  VERCEL_TOKEN: z.string().optional(),
  RAILWAY_TOKEN: z.string().optional(),
  FLY_API_TOKEN: z.string().optional(),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(120),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  // Fail fast with a readable message rather than crashing deep in a handler.
  const issues = parsed.error.issues
    .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
    .join("\n");
  throw new Error(`Invalid environment configuration:\n${issues}`);
}

export const env = parsed.data;

export const apiKeys = env.DEVIBE_API_KEYS.split(",")
  .map((k) => k.trim())
  .filter(Boolean);

export const isProd = env.NODE_ENV === "production";
