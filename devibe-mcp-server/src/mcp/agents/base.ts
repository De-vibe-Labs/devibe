import type { AgentRole } from "./types.js";

export interface AgentDefinition {
  role: AgentRole;
  name: string;
  /** One-line description of the agent's responsibility. */
  description: string;
  /** System prompt used when this agent drives an AI generation. */
  systemPrompt: string;
  /** MCP tool names this agent is responsible for. */
  tools: string[];
}

export function defineAgent(def: AgentDefinition): AgentDefinition {
  return def;
}
