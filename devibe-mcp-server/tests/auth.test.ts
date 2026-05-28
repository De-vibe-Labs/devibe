import { describe, it, expect, beforeAll } from "vitest";

// Configure a static API key before the env module is imported.
beforeAll(() => {
  process.env.DEVIBE_API_KEYS = "test-key-123";
});

describe("authenticate", () => {
  it("accepts a configured API key", async () => {
    const { authenticate } = await import("../src/auth/index.js");
    const actor = await authenticate("Bearer test-key-123");
    expect(actor.method).toBe("api_key");
    expect(actor.scopes).toContain("tools:*");
  });

  it("rejects a missing header", async () => {
    const { authenticate } = await import("../src/auth/index.js");
    await expect(authenticate(undefined)).rejects.toThrow();
  });

  it("rejects an unknown token", async () => {
    const { authenticate } = await import("../src/auth/index.js");
    await expect(authenticate("Bearer nope")).rejects.toThrow();
  });
});
