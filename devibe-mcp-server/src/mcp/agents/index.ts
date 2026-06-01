import type { AgentDefinition } from "./base.js";
import type { AgentRole } from "./types.js";
import { productAgent } from "./product.agent.js";
import { designAgent } from "./design.agent.js";
import { frontendAgent } from "./frontend.agent.js";
import { backendAgent } from "./backend.agent.js";
import { mobileAgent } from "./mobile.agent.js";
import { aiAgent } from "./ai.agent.js";
import { blockchainAgent } from "./blockchain.agent.js";
import { qaAgent } from "./qa.agent.js";
import { deploymentAgent } from "./deployment.agent.js";
import { handoffAgent } from "./handoff.agent.js";

export const AGENTS: AgentDefinition[] = [
  productAgent,
  designAgent,
  frontendAgent,
  backendAgent,
  mobileAgent,
  aiAgent,
  blockchainAgent,
  qaAgent,
  deploymentAgent,
  handoffAgent,
];

export const agentsByRole: Record<AgentRole, AgentDefinition> = Object.fromEntries(
  AGENTS.map((a) => [a.role, a]),
) as Record<AgentRole, AgentDefinition>;

/** Find the agent that owns a given tool (first match wins). */
export function agentForTool(toolName: string): AgentDefinition | undefined {
  return AGENTS.find((a) => a.tools.includes(toolName));
}

export { type AgentDefinition } from "./base.js";
export { type AgentRole, AGENT_ROLES } from "./types.js";
