# Devibe MCP Server

A production-ready [Model Context Protocol](https://modelcontextprotocol.io) server that lets AI
agents take a software product from **idea → product plan → app architecture → code tasks →
developer handoff → production deployment**.

It exposes 10 typed MCP tools, a 10-agent routing system, persistent project memory, GitHub issue
creation, deployment-readiness checks, marketplace matching, background jobs, audit logging,
authentication, and rate limiting.

## Architecture

```
Streamable HTTP (Hono) ──► MCP Server (registry) ──► Tools ──► Agents
                                   │                    │
                                   │                    ├─ services/ai      (Gemini)
   Auth (API key / Clerk /        │                    ├─ services/github  (Octokit)
   Supabase JWT) + rate limit     │                    ├─ services/deployment
                                   │                    └─ services/marketplace (Stripe)
                                   ▼
                          PostgreSQL (Drizzle ORM)  +  Redis/BullMQ (background pipeline)
```

### Folder structure

```
devibe-mcp-server/
├── src/
│   ├── server.ts            # Hono + Streamable HTTP transport, health/REST routes
│   ├── mcp/
│   │   ├── tools/           # 10 MCP tools (one file each) + base + index
│   │   ├── agents/          # 10 agent modules + index
│   │   ├── router.ts        # agent ⇄ tool routing + default pipeline
│   │   └── registry.ts      # builds the McpServer, wires tools + resources
│   ├── db/                  # Drizzle schema, client, repo helpers
│   ├── services/            # ai, github, deployment, marketplace
│   ├── queues/              # BullMQ queue + worker (background pipeline)
│   ├── auth/                # API key / Clerk / Supabase JWT verification
│   └── utils/               # env, logger, errors, ids, rate-limit
├── tests/                   # vitest unit tests
├── drizzle/                 # generated SQL migrations
├── .env.example
├── drizzle.config.ts
├── package.json
└── README.md
```

## MCP tools

| Tool | What it does |
| --- | --- |
| `create_project_brief` | Idea → summary, target users, problem, solution, MVP scope, business model |
| `generate_prd` | Full PRD: features, user stories, pages, data models, API requirements, metrics |
| `generate_app_architecture` | Frontend, backend, DB schema, API structure, auth, deployment plan, security |
| `generate_pages_and_screens` | All screens for websites, mobile, dashboards, SaaS, AI, blockchain apps |
| `generate_code_tasks` | Developer-ready tasks: title, description, priority, stack, files, acceptance criteria |
| `generate_mobile_app` | Generate a runnable mobile app codebase (Claude, cost-tiered: Haiku→Sonnet→Opus) |
| `review_codebase` | Quality, security, performance, structure, missing features, deploy readiness |
| `create_github_issues` | Turns tasks into GitHub issues |
| `match_developer` | Routes work to freelancers / dev houses by skills, budget, rating, availability |
| `deployment_checklist` | Env vars, auth, DB, API health, build, security → scored readiness |
| `generate_handoff_pack` | Context, task brief, GitHub links, files, acceptance criteria, budget, timeline |

### Agents

Product · Design · Frontend · Backend · Mobile · AI · Blockchain · QA · Deployment · Handoff.
Each agent owns a subset of tools and carries a system prompt used when driving AI generation.
See the routing map at runtime: `GET /routing` or the MCP resource `devibe://routing`.

## Mobile app generation (cost-tiered Claude)

`generate_mobile_app` builds a runnable mobile app codebase (React Native + Expo by default;
Flutter / iOS-Swift / Android-Kotlin also accepted) using Claude with **cost-tiered escalation**.
The lesser models are tried first to keep cost down, escalating only when needed:

```
Haiku 4.5  ──fails validation/errors──▶  Sonnet 4.6  ──▶  Opus 4.7
(cheapest, tried first)                                  (most capable)
```

Each tier returns structured JSON (file list with real code) via Claude structured outputs;
if a cheaper tier's output doesn't validate, the next tier is attempted. After Claude, if no
tier produced a valid result (or `ANTHROPIC_API_KEY` is unset), the tool falls back to
**Gemini** (`GEMINI_API_KEY`) and finally to a deterministic Expo scaffold. The response
reports `provider` (`claude` | `gemini` | `fallback`), `modelTier`/`model`, and the full
`escalation.attempts` trail. Set `startTier` (`haiku` | `sonnet` | `opus`) to raise the
Claude floor, or `provider` (`auto` | `claude` | `gemini`) to force one path.

Example arguments:

```jsonc
{
  "name": "generate_mobile_app",
  "arguments": {
    "appName": "ZenFlow",
    "description": "A breathing tracker with streak tracking and reminders",
    "platform": "react_native_expo",
    "screens": ["Home", "Breathe", "Stats", "Settings"],
    "startTier": "haiku"
  }
}
```

## Getting started

### Prerequisites
- Node.js 20+
- PostgreSQL (optional — tools degrade gracefully without it)
- Redis (optional — required only for the background pipeline)

### Install & configure

```bash
cd devibe-mcp-server
npm install
cp .env.example .env   # fill in values
```

Minimum to boot: nothing is strictly required. To enable persistence set `DATABASE_URL`; to enable
real AI generation set `GEMINI_API_KEY`; to create issues set `GITHUB_TOKEN`. Set
`DEVIBE_API_KEYS` (or a Clerk/Supabase JWKS url) to require authentication.

### Database

```bash
npm run db:generate   # generate SQL migrations from src/db/schema.ts
npm run db:migrate    # apply them
# or, for rapid local dev:
npm run db:push
```

### Run

```bash
npm run dev           # server with hot reload  (http://localhost:8787)
npm run worker        # background pipeline worker (needs REDIS_URL)
npm run build && npm start
```

### Test & typecheck

```bash
npm test
npm run typecheck
```

## Calling the server

The MCP endpoint is `POST/GET/DELETE /mcp` (Streamable HTTP). All requests require
`Authorization: Bearer <api-key-or-jwt>` when auth is configured.

### Initialize a session (curl)

```bash
curl -i http://localhost:8787/mcp \
  -H "Authorization: Bearer dev-local-key" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize",
       "params":{"protocolVersion":"2024-11-05","capabilities":{},
       "clientInfo":{"name":"curl","version":"1.0"}}}'
# → response includes an `mcp-session-id` header; reuse it on subsequent calls.
```

### Example tool call

```jsonc
// POST /mcp  (with mcp-session-id header from initialize)
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "create_project_brief",
    "arguments": {
      "idea": "A marketplace for renting camera gear between creators.",
      "type": "marketplace"
    }
  }
}
```

### Connect from an MCP client (TypeScript)

```ts
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const transport = new StreamableHTTPClientTransport(new URL("http://localhost:8787/mcp"), {
  requestInit: { headers: { Authorization: "Bearer dev-local-key" } },
});
const client = new Client({ name: "devibe-client", version: "1.0.0" });
await client.connect(transport);

const brief = await client.callTool({
  name: "create_project_brief",
  arguments: { idea: "An AI tool that drafts grant applications." },
});
console.log(brief.structuredContent);
```

### Background pipeline (REST)

```bash
curl -X POST http://localhost:8787/api/pipeline \
  -H "Authorization: Bearer dev-local-key" \
  -H "Content-Type: application/json" \
  -d '{"idea":"A SaaS for restaurant inventory"}'
# → { "jobId": "...", "status": "queued" }
```

The worker runs brief → PRD → architecture → code tasks and persists each step.

## Configuration reference

See [`.env.example`](./.env.example). Key variables:

- `DEVIBE_API_KEYS` — comma-separated static bearer keys.
- `CLERK_JWKS_URL` / `CLERK_ISSUER` or `SUPABASE_JWKS_URL` / `SUPABASE_JWT_ISSUER` — JWT auth.
- `DATABASE_URL` — PostgreSQL connection string.
- `REDIS_URL` — Redis connection for BullMQ.
- `GEMINI_API_KEY`, `GEMINI_MODEL` — AI generation for planning tools.
- `ANTHROPIC_API_KEY` — Claude generation for `generate_mobile_app` (cost-tiered Haiku→Sonnet→Opus).
- `GITHUB_TOKEN` — GitHub issue creation.
- `STRIPE_SECRET_KEY` — marketplace escrow.
- `VERCEL_TOKEN` / `RAILWAY_TOKEN` / `FLY_API_TOKEN` — deployment providers.
- `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX` — rate limiting.

## Deployment

The server is a standard Node HTTP service listening on `PORT`.

- **Railway / Fly.io**: `npm run build` then `npm start`; run `npm run worker` as a second
  process/service. Provision Postgres + Redis add-ons and set env vars.
- **Vercel Functions**: deploy the Hono app via the Node runtime; use managed Postgres
  (e.g. Neon/Supabase) and a hosted Redis (e.g. Upstash) for queues.
- Run `npm run db:migrate` as a release/predeploy step.
- Probe `GET /health` for liveness/readiness; it reports AI/GitHub/queue/DB/auth status.

## Security notes

- All inputs are validated with zod at the tool boundary.
- Authentication is required on `/mcp` and `/api/*` when configured; rate limiting is per-actor.
- Secrets are redacted in logs; never commit `.env`.
- Audit logs record actor, action, and resource for every state-changing tool call.
