import { describe, it, expect } from "vitest";
import { evaluateReadiness } from "../src/services/deployment.js";

describe("evaluateReadiness", () => {
  it("flags not-ready when required env vars are missing", () => {
    const r = evaluateReadiness({
      provider: "vercel",
      envVars: [],
      hasAuth: false,
      hasDatabase: false,
      buildPassing: false,
      securityReviewed: false,
    });
    expect(r.ready).toBe(false);
    expect(r.score).toBeLessThan(50);
  });

  it("is ready when all critical checks pass", () => {
    const r = evaluateReadiness({
      provider: "railway",
      envVars: ["DATABASE_URL", "NODE_ENV"],
      hasAuth: true,
      hasDatabase: true,
      apiHealthUrl: "https://api.example.com/health",
      buildPassing: true,
      securityReviewed: true,
    });
    expect(r.ready).toBe(true);
    expect(r.score).toBe(100);
  });
});
