import { describe, it, expect } from "vitest";
import { createProjectBrief } from "../src/mcp/tools/create-project-brief.js";
import { generatePrd } from "../src/mcp/tools/generate-prd.js";
import { generateCodeTasks } from "../src/mcp/tools/generate-code-tasks.js";

const ctx = { actorId: "test-actor" };

// These run without GEMINI_API_KEY / DATABASE_URL, exercising the fallback paths.

describe("create_project_brief (fallback)", () => {
  it("returns a structured brief from an idea", async () => {
    const res = (await createProjectBrief.handler(
      { idea: "A marketplace for renting camera gear between creators.", persist: false } as never,
      ctx,
    )) as any;
    expect(res.brief.productSummary).toContain("camera");
    expect(Array.isArray(res.brief.mvpScope)).toBe(true);
    expect(res.generatedBy).toBe("fallback");
  });
});

describe("generate_prd (fallback)", () => {
  it("returns a PRD with features and metrics", async () => {
    const res = (await generatePrd.handler({ idea: "A SaaS for invoicing" } as never, ctx)) as any;
    expect(res.prd.features.length).toBeGreaterThan(0);
    expect(res.prd.successMetrics.length).toBeGreaterThan(0);
  });
});

describe("generate_code_tasks (fallback)", () => {
  it("respects maxTasks", async () => {
    const res = (await generateCodeTasks.handler(
      { maxTasks: 2, persist: false } as never,
      ctx,
    )) as any;
    expect(res.tasks.length).toBeLessThanOrEqual(2);
  });
});
