import type { z, ZodRawShape } from "zod";

export interface ToolContext {
  /** Authenticated caller id (user id or api-key label). */
  actorId: string;
}

export interface DevibeTool<Shape extends ZodRawShape = ZodRawShape> {
  name: string;
  title: string;
  description: string;
  inputSchema: Shape;
  /** Returns a JSON-serializable result; the registry wraps it for MCP. */
  handler: (args: z.objectOutputType<Shape, z.ZodTypeAny>, ctx: ToolContext) => Promise<unknown>;
}

export function defineTool<Shape extends ZodRawShape>(tool: DevibeTool<Shape>): DevibeTool<Shape> {
  return tool;
}
