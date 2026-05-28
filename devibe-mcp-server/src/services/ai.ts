import { GoogleGenAI } from "@google/genai";
import { env } from "../utils/env.js";
import { logger } from "../utils/logger.js";

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI | null {
  if (!env.GEMINI_API_KEY) return null;
  if (!client) client = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  return client;
}

export function isAiConfigured(): boolean {
  return Boolean(env.GEMINI_API_KEY);
}

interface GenerateOptions {
  system?: string;
  temperature?: number;
}

/**
 * Generate structured JSON from a prompt. When GEMINI_API_KEY is missing, the
 * caller's `fallback` is returned so the platform stays usable offline / in CI.
 */
export async function generateJson<T>(
  prompt: string,
  fallback: T,
  opts: GenerateOptions = {},
): Promise<{ data: T; source: "ai" | "fallback" }> {
  const ai = getClient();
  if (!ai) {
    logger.debug("GEMINI_API_KEY not set — using deterministic fallback");
    return { data: fallback, source: "fallback" };
  }

  try {
    const res = await ai.models.generateContent({
      model: env.GEMINI_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: opts.temperature ?? 0.4,
        ...(opts.system ? { systemInstruction: opts.system } : {}),
      },
    });
    const text = res.text;
    if (!text) return { data: fallback, source: "fallback" };
    return { data: JSON.parse(text) as T, source: "ai" };
  } catch (err) {
    logger.warn({ err }, "AI generation failed; returning fallback");
    return { data: fallback, source: "fallback" };
  }
}

export async function generateText(prompt: string, opts: GenerateOptions = {}): Promise<string> {
  const ai = getClient();
  if (!ai) return "";
  try {
    const res = await ai.models.generateContent({
      model: env.GEMINI_MODEL,
      contents: prompt,
      config: {
        temperature: opts.temperature ?? 0.4,
        ...(opts.system ? { systemInstruction: opts.system } : {}),
      },
    });
    return res.text ?? "";
  } catch (err) {
    logger.warn({ err }, "AI text generation failed");
    return "";
  }
}
