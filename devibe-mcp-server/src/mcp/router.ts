import { AGENTS, agentForTool, type AgentDefinition, type AgentRole } from "./agents/index.js";
import { TOOLS } from "./tools/index.js";

/**
 * The router maps the agent layer to the tool layer. It answers:
 *  - which agent owns a given tool
 *  - which tools an agent can run
 *  - a recommended end-to-end pipeline across agents
 */

export interface PipelineStep {
  agent: AgentRole;
  tool: string;
  description: string;
}

export function toolsForAgent(role: AgentRole): string[] {
  const agent = AGENTS.find((a) => a.role === role);
  return agent ? agent.tools : [];
}

export function ownerOf(toolName: string): AgentDefinition | undefined {
  return agentForTool(toolName);
}

/** The default idea -> production pipeline Devibe orchestrates. */
export const DEFAULT_PIPELINE: PipelineStep[] = [
  { agent: "product", tool: "create_project_brief", description: "Idea to brief" },
  { agent: "product", tool: "generate_prd", description: "Brief to PRD" },
  { agent: "backend", tool: "generate_app_architecture", description: "PRD to architecture" },
  { agent: "design", tool: "generate_pages_and_screens", description: "Architecture to screens" },
  { agent: "frontend", tool: "generate_code_tasks", description: "Plan to tasks" },
  { agent: "qa", tool: "review_codebase", description: "Review the build" },
  { agent: "handoff", tool: "create_github_issues", description: "Tasks to GitHub issues" },
  { agent: "handoff", tool: "match_developer", description: "Route work to developers" },
  { agent: "deployment", tool: "deployment_checklist", description: "Verify readiness" },
  { agent: "handoff", tool: "generate_handoff_pack", description: "Package for handoff" },
];

export function describeRouting() {
  return {
    agents: AGENTS.map((a) => ({ role: a.role, name: a.name, tools: a.tools })),
    tools: TOOLS.map((t) => ({ name: t.name, owner: ownerOf(t.name)?.role ?? null })),
    pipeline: DEFAULT_PIPELINE,
  };
}
