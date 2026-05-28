import pino from "pino";
import { env, isProd } from "./env.js";

export const logger = pino({
  level: env.LOG_LEVEL,
  transport: isProd
    ? undefined
    : { target: "pino-pretty", options: { colorize: true, translateTime: "SYS:standard" } },
  base: { service: "devibe-mcp-server" },
  redact: {
    paths: [
      "req.headers.authorization",
      "*.apiKey",
      "*.token",
      "*.secret",
      "GEMINI_API_KEY",
      "GITHUB_TOKEN",
      "STRIPE_SECRET_KEY",
    ],
    censor: "[redacted]",
  },
});

export type Logger = typeof logger;
