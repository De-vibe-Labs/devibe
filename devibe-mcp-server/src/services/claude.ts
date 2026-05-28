import Anthropic from "@anthropic-ai/sdk";
import { env } from "../utils/env.js";
import { logger } from "../utils/logger.js";

/**
 * Claude-backed generation with cost-tiered escalation.
 *
 * Tiers are ordered cheapest -> most capable. We deliberately try the *lesser*
 * model first (the user's explicit cost preference) and only escalate to a more
 * expensive tier when the cheaper one's output fails validation or errors.
 *
 * Model IDs, thinking, and effort follow the per-model rules:
 *  - Haiku 4.5: no `effort` (errors), no adaptive thinking — plain structured output.
 *  - Sonnet 4.6 / Opus 4.7: adaptive thinking + `effort`.
 */

export type ClaudeTier = "haiku" | "sonnet" | "opus";

interface TierConfig {
  model: string;
  thinking: boolean;
  effort?: "low" | "medium" | "high";
}

const TIERS: Record<ClaudeTier, TierConfig> = {
  haiku: { model: "claude-haiku-4-5", thinking: false },
  sonnet: { model: "claude-sonnet-4-6", thinking: true, effort: "medium" },
  opus: { model: "claude-opus-4-7", thinking: true, effort: "high" },
};

// Cheapest first — this is the escalation order.
export const TIER_ORDER: ClaudeTier[] = ["haiku", "sonnet", "opus"];

let client: Anthropic | null = null;

function getClient(): Anthropic | null {
  if (!env.ANTHROPIC_API_KEY) return null;
  if (!client) client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  return client;
}

export function isClaudeConfigured(): boolean {
  return Boolean(env.ANTHROPIC_API_KEY);
}

export interface EscalationResult<T> {
  data: T;
  source: "claude" | "fallback";
  tier: ClaudeTier | null;
  model: string | null;
  /** Tiers attempted before success, for observability. */
  attempts: Array<{ tier: ClaudeTier; ok: boolean; reason?: string }>;
}

async function runTier(
  ai: Anthropic,
  tier: ClaudeTier,
  system: string,
  prompt: string,
  schema: Record<string, unknown>,
  maxTokens: number,
): Promise<string> {
  const cfg = TIERS[tier];
  // output_config / cache_control may be newer than the pinned SDK's types;
  // build the request loosely and let the runtime validate.
  const params: Record<string, unknown> = {
    model: cfg.model,
    max_tokens: maxTokens,
    system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: prompt }],
    output_config: { format: { type: "json_schema", schema } },
  };
  if (cfg.thinking) params.thinking = { type: "adaptive" };
  if (cfg.effort) (params.output_config as Record<string, unknown>).effort = cfg.effort;

  // Stream to avoid HTTP timeouts on large code-generation outputs.
  const stream = ai.messages.stream(params as never);
  const message = await stream.finalMessage();
  const textBlock = message.content.find((b) => b.type === "text");
  return textBlock && "text" in textBlock ? textBlock.text : "";
}

/**
 * Generate structured JSON, escalating cheapest -> most capable until the
 * output validates. Returns `fallback` if Claude is unconfigured or every
 * tier fails.
 */
export async function generateJsonWithEscalation<T>(
  opts: {
    system: string;
    prompt: string;
    schema: Record<string, unknown>;
    validate: (data: unknown) => data is T;
    startTier?: ClaudeTier;
    maxTokens?: number;
  },
  fallback: T,
): Promise<EscalationResult<T>> {
  const ai = getClient();
  const attempts: EscalationResult<T>["attempts"] = [];

  if (!ai) {
    return { data: fallback, source: "fallback", tier: null, model: null, attempts };
  }

  const startIdx = Math.max(0, TIER_ORDER.indexOf(opts.startTier ?? "haiku"));
  const maxTokens = opts.maxTokens ?? 32_000;

  for (const tier of TIER_ORDER.slice(startIdx)) {
    try {
      const text = await runTier(ai, tier, opts.system, opts.prompt, opts.schema, maxTokens);
      const parsed = JSON.parse(text) as unknown;
      if (opts.validate(parsed)) {
        attempts.push({ tier, ok: true });
        logger.info({ tier, model: TIERS[tier].model }, "claude generation succeeded");
        return { data: parsed, source: "claude", tier, model: TIERS[tier].model, attempts };
      }
      attempts.push({ tier, ok: false, reason: "validation_failed" });
      logger.warn({ tier }, "claude output failed validation; escalating");
    } catch (err) {
      attempts.push({ tier, ok: false, reason: err instanceof Error ? err.message : "error" });
      logger.warn({ err, tier }, "claude tier errored; escalating");
    }
  }

  logger.warn("all claude tiers failed; using fallback");
  return { data: fallback, source: "fallback", tier: null, model: null, attempts };
}
