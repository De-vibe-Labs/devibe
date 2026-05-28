import { env } from "../utils/env.js";

export type Provider = "vercel" | "railway" | "fly";

export interface CheckResult {
  id: string;
  label: string;
  category: "env" | "auth" | "database" | "api" | "build" | "security";
  status: "pass" | "warn" | "fail";
  detail: string;
}

export interface DeploymentReadiness {
  provider: Provider;
  ready: boolean;
  score: number; // 0-100
  checks: CheckResult[];
}

interface ChecklistInput {
  provider: Provider;
  envVars: string[];
  hasAuth: boolean;
  hasDatabase: boolean;
  apiHealthUrl?: string;
  buildPassing: boolean;
  securityReviewed: boolean;
}

const REQUIRED_BASE_ENV = ["DATABASE_URL", "NODE_ENV"];

/** Pure readiness evaluation — deterministic, no external calls required. */
export function evaluateReadiness(input: ChecklistInput): DeploymentReadiness {
  const checks: CheckResult[] = [];
  const present = new Set(input.envVars.map((v) => v.toUpperCase()));

  for (const key of REQUIRED_BASE_ENV) {
    checks.push({
      id: `env_${key.toLowerCase()}`,
      label: `Environment variable ${key}`,
      category: "env",
      status: present.has(key) ? "pass" : "fail",
      detail: present.has(key) ? `${key} is configured` : `${key} is missing`,
    });
  }

  checks.push({
    id: "auth",
    label: "Authentication configured",
    category: "auth",
    status: input.hasAuth ? "pass" : "fail",
    detail: input.hasAuth ? "Auth provider wired up" : "No authentication configured",
  });

  checks.push({
    id: "database",
    label: "Database provisioned",
    category: "database",
    status: input.hasDatabase ? "pass" : "warn",
    detail: input.hasDatabase ? "Database reachable" : "No database detected",
  });

  checks.push({
    id: "api_health",
    label: "API health endpoint",
    category: "api",
    status: input.apiHealthUrl ? "pass" : "warn",
    detail: input.apiHealthUrl ? `Health endpoint: ${input.apiHealthUrl}` : "No health endpoint provided",
  });

  checks.push({
    id: "build",
    label: "Build passing",
    category: "build",
    status: input.buildPassing ? "pass" : "fail",
    detail: input.buildPassing ? "Latest build succeeded" : "Build is failing",
  });

  checks.push({
    id: "security",
    label: "Security review",
    category: "security",
    status: input.securityReviewed ? "pass" : "warn",
    detail: input.securityReviewed ? "Security checklist completed" : "Security review pending",
  });

  const weight = { pass: 1, warn: 0.5, fail: 0 } as const;
  const score = Math.round(
    (checks.reduce((sum, c) => sum + weight[c.status], 0) / checks.length) * 100,
  );
  const ready = !checks.some((c) => c.status === "fail");

  return { provider: input.provider, ready, score, checks };
}

export function providerToken(provider: Provider): string | undefined {
  switch (provider) {
    case "vercel":
      return env.VERCEL_TOKEN;
    case "railway":
      return env.RAILWAY_TOKEN;
    case "fly":
      return env.FLY_API_TOKEN;
  }
}
