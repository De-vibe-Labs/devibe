import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { TOOLS, type DevibeTool, type ToolContext } from "./tools/index.js";
import { describeRouting } from "./router.js";
import { logger } from "../utils/logger.js";
import { toErrorPayload } from "../utils/errors.js";

const SERVER_INFO = { name: "devibe-mcp-server", version: "1.0.0" } as const;

function resultOf(value: unknown): CallToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(value, null, 2) }],
    structuredContent: (value && typeof value === "object" ? (value as Record<string, unknown>) : { value }),
  };
}

function errorResult(err: unknown): CallToolResult {
  const payload = toErrorPayload(err);
  return {
    content: [{ type: "text", text: JSON.stringify({ error: payload }, null, 2) }],
    isError: true,
  };
}

function actorFrom(extra: { authInfo?: { clientId?: string; extra?: Record<string, unknown> } }): string {
  const fromExtra = extra.authInfo?.extra?.["actorId"];
  if (typeof fromExtra === "string" && fromExtra) return fromExtra;
  return extra.authInfo?.clientId ?? "anonymous";
}

function registerTool(server: McpServer, tool: DevibeTool): void {
  server.registerTool(
    tool.name,
    { title: tool.title, description: tool.description, inputSchema: tool.inputSchema },
    async (args: unknown, extra: any): Promise<CallToolResult> => {
      const ctx: ToolContext = { actorId: actorFrom(extra) };
      const started = Date.now();
      try {
        const out = await tool.handler(args as never, ctx);
        logger.info({ tool: tool.name, actorId: ctx.actorId, ms: Date.now() - started }, "tool ok");
        return resultOf(out);
      } catch (err) {
        logger.error({ err, tool: tool.name, actorId: ctx.actorId }, "tool error");
        return errorResult(err);
      }
    },
  );
}

/** Build a fresh McpServer with all Devibe tools + routing resource registered. */
export function createMcpServer(): McpServer {
  const server = new McpServer(SERVER_INFO, {
    capabilities: { tools: {}, resources: {} },
  });

  for (const tool of TOOLS) registerTool(server, tool);

  // Expose the agent/tool routing map as a readable resource.
  server.registerResource(
    "routing",
    "devibe://routing",
    { title: "Devibe agent & tool routing", mimeType: "application/json" },
    async () => ({
      contents: [
        {
          uri: "devibe://routing",
          mimeType: "application/json",
          text: JSON.stringify(describeRouting(), null, 2),
        },
      ],
    }),
  );

  return server;
}

export const toolNames = TOOLS.map((t) => t.name);
