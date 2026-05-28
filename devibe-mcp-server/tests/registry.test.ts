import { describe, it, expect } from "vitest";
import { TOOLS } from "../src/mcp/tools/index.js";
import { AGENTS, agentForTool } from "../src/mcp/agents/index.js";
import { DEFAULT_PIPELINE, describeRouting } from "../src/mcp/router.js";

const EXPECTED_TOOLS = [
  "create_project_brief",
  "generate_prd",
  "generate_app_architecture",
  "generate_pages_and_screens",
  "generate_code_tasks",
  "generate_mobile_app",
  "review_codebase",
  "create_github_issues",
  "match_developer",
  "deployment_checklist",
  "generate_handoff_pack",
];

describe("tool registry", () => {
  it("exposes all core tools", () => {
    expect(TOOLS.map((t) => t.name).sort()).toEqual([...EXPECTED_TOOLS].sort());
  });

  it("gives every tool a unique name, title, and schema", () => {
    const names = new Set<string>();
    for (const t of TOOLS) {
      expect(t.title).toBeTruthy();
      expect(t.description.length).toBeGreaterThan(10);
      expect(typeof t.inputSchema).toBe("object");
      expect(names.has(t.name)).toBe(false);
      names.add(t.name);
    }
  });
});

describe("agents", () => {
  it("defines all 10 agent roles", () => {
    expect(AGENTS).toHaveLength(10);
  });

  it("maps every tool to an owning agent", () => {
    for (const t of TOOLS) {
      expect(agentForTool(t.name)).toBeDefined();
    }
  });
});

describe("router", () => {
  it("produces a full lifecycle pipeline", () => {
    expect(DEFAULT_PIPELINE[0]!.tool).toBe("create_project_brief");
    expect(DEFAULT_PIPELINE.at(-1)!.tool).toBe("generate_handoff_pack");
  });

  it("describes routing with agents, tools, and pipeline", () => {
    const r = describeRouting();
    expect(r.agents).toHaveLength(10);
    expect(r.tools).toHaveLength(EXPECTED_TOOLS.length);
    expect(r.pipeline.length).toBeGreaterThan(0);
  });
});
