import { serve } from "@hono/node-server";
import { RESPONSE_ALREADY_SENT } from "@hono/node-server/utils/response";
import { Hono } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { IncomingMessage, ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { createMcpServer, toolNames } from "./mcp/registry.js";
import { describeRouting } from "./mcp/router.js";
import { authenticate, authConfigured } from "./auth/index.js";
import { rateLimiter } from "./utils/rate-limit.js";
import { env } from "./utils/env.js";
import { logger } from "./utils/logger.js";
import { toErrorPayload } from "./utils/errors.js";
import { pingDb } from "./db/client.js";
import { isAiConfigured } from "./services/ai.js";
import { isClaudeConfigured } from "./services/claude.js";
import { isGithubConfigured } from "./services/github.js";
import { isQueueConfigured, enqueuePipeline } from "./queues/index.js";

const app = new Hono();

// Per-session MCP transports (Streamable HTTP keeps state across requests).
const transports = new Map<string, StreamableHTTPServerTransport>();

// --- Health & metadata (unauthenticated) -----------------------------------

app.get("/health", async (c) => {
  return c.json({
    status: "ok",
    service: "devibe-mcp-server",
    version: "1.0.0",
    checks: {
      ai: isAiConfigured(),
      claude: isClaudeConfigured(),
      github: isGithubConfigured(),
      queue: isQueueConfigured(),
      database: await pingDb(),
      auth: authConfigured(),
    },
  });
});

app.get("/", (c) =>
  c.json({
    name: "Devibe MCP Server",
    description: "idea → product plan → architecture → code tasks → handoff → deployment",
    mcpEndpoint: "/mcp",
    tools: toolNames,
  }),
);

app.get("/routing", (c) => c.json(describeRouting()));

// --- Auth + rate-limit gate for everything below ---------------------------

async function gate(c: { req: { header: (k: string) => string | undefined } }) {
  if (!authConfigured()) {
    logger.warn("no auth configured — set DEVIBE_API_KEYS or a JWKS url");
  }
  const actor = await authenticate(c.req.header("authorization"));
  rateLimiter.check(actor.id);
  return actor;
}

function statusOf(err: unknown, fallback: number): ContentfulStatusCode {
  const status = (err as { status?: number }).status ?? fallback;
  return status as ContentfulStatusCode;
}

// --- REST: enqueue a full planning pipeline as a background job ------------

app.post("/api/pipeline", async (c) => {
  let actor;
  try {
    actor = await gate(c);
  } catch (err) {
    return c.json({ error: toErrorPayload(err) }, statusOf(err, 401));
  }
  const body = await c.req.json().catch(() => ({}));
  if (!body.idea || typeof body.idea !== "string") {
    return c.json({ error: { code: "validation_error", message: "`idea` is required" } }, 422);
  }
  try {
    const jobId = await enqueuePipeline({ idea: body.idea, actorId: actor.id, projectId: body.projectId });
    return c.json({ jobId, status: "queued" }, 202);
  } catch (err) {
    return c.json({ error: toErrorPayload(err) }, statusOf(err, 500));
  }
});

// --- MCP Streamable HTTP endpoint ------------------------------------------

app.all("/mcp", async (c) => {
  const nodeEnv = c.env as { incoming: IncomingMessage; outgoing: ServerResponse };
  const incoming = nodeEnv.incoming;
  const outgoing = nodeEnv.outgoing;

  // Authenticate and attach AuthInfo so tool handlers know the actor.
  let actor;
  try {
    actor = await gate(c);
  } catch (err) {
    const p = toErrorPayload(err);
    return c.json({ jsonrpc: "2.0", error: { code: -32001, message: p.message }, id: null }, 401);
  }
  (incoming as unknown as { auth: unknown }).auth = {
    token: "session",
    clientId: actor.id,
    scopes: actor.scopes,
    extra: { actorId: actor.id },
  };

  const method = c.req.method;
  const sessionId = c.req.header("mcp-session-id");

  // Reuse an existing session transport when present.
  if (sessionId && transports.has(sessionId)) {
    const transport = transports.get(sessionId)!;
    const body = method === "POST" ? await c.req.json().catch(() => undefined) : undefined;
    await transport.handleRequest(incoming, outgoing, body);
    return RESPONSE_ALREADY_SENT;
  }

  // New session: must be an initialize request on POST.
  if (method === "POST") {
    const body = await c.req.json().catch(() => undefined);
    if (!isInitializeRequest(body)) {
      return c.json(
        { jsonrpc: "2.0", error: { code: -32000, message: "No valid session; expected initialize." }, id: null },
        400,
      );
    }
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (sid) => {
        transports.set(sid, transport);
        logger.info({ sessionId: sid, actorId: actor.id }, "mcp session initialized");
      },
    });
    transport.onclose = () => {
      if (transport.sessionId) transports.delete(transport.sessionId);
    };
    const server = createMcpServer();
    await server.connect(transport);
    await transport.handleRequest(incoming, outgoing, body);
    return RESPONSE_ALREADY_SENT;
  }

  return c.json(
    { jsonrpc: "2.0", error: { code: -32000, message: "Missing or invalid mcp-session-id." }, id: null },
    400,
  );
});

// --- Lifecycle -------------------------------------------------------------

const port = env.PORT;
const server = serve({ fetch: app.fetch, port }, (info) => {
  logger.info({ port: info.port }, "devibe-mcp-server listening");
});

// Periodically reclaim expired rate-limit buckets.
const sweep = setInterval(() => rateLimiter.sweep(), 60_000);
sweep.unref();

function shutdown(signal: string) {
  logger.info({ signal }, "shutting down");
  clearInterval(sweep);
  for (const t of transports.values()) void t.close();
  server.close(() => process.exit(0));
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

export { app };
