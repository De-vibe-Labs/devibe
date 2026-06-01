import { describe, it, expect } from "vitest";
import { generateMobileApp } from "../src/mcp/tools/generate-mobile-app.js";
import { TIER_ORDER } from "../src/services/claude.js";

const ctx = { actorId: "test-actor" };

// Runs without ANTHROPIC_API_KEY — exercises the deterministic Expo fallback.

describe("generate_mobile_app (fallback)", () => {
  it("returns a runnable Expo scaffold with the requested screens", async () => {
    const res = (await generateMobileApp.handler(
      {
        appName: "ZenFlow",
        description: "A breathing tracker",
        platform: "react_native_expo",
        screens: ["Home", "Breathe"],
        startTier: "haiku",
        persist: false,
      } as never,
      ctx,
    )) as any;

    expect(res.app.appName).toBe("ZenFlow");
    expect(res.app.files.some((f: any) => f.path === "App.tsx")).toBe(true);
    expect(res.app.files.some((f: any) => f.path.includes("BreatheScreen"))).toBe(true);
    expect(res.generatedBy).toBe("fallback");
  });

  it("escalates cheapest-first (haiku before opus)", () => {
    expect(TIER_ORDER[0]).toBe("haiku");
    expect(TIER_ORDER.at(-1)).toBe("opus");
  });
});
