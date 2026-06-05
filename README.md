<div align="center">

# 🚀 DeVibe

### AI-Native Software Creation Platform

**From idea to production-ready application — powered by AI agents.**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue?logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61dafb?logo=react)](https://react.dev/)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

</div>

---

## What is DeVibe?

DeVibe is an **AI-powered product operating system** that manages the entire software creation lifecycle. Founders, businesses, developers, and agencies describe an idea through a chat interface and receive a production-ready web or mobile application.

DeVibe is not just an AI coding tool — it orchestrates a full team of specialized AI agents that mirror a real engineering org: product manager, UX designer, frontend engineer, backend engineer, database architect, DevOps engineer, QA engineer, security engineer, and technical writer.

---

## Core User Journey

1. **Create account** — sign up and set up your organization.
2. **Create project** — name your idea and pick a template or start from scratch.
3. **Enter idea** — describe what you want to build in plain language.
4. **AI interviews you** — the Product Manager Agent asks follow-up questions to refine scope.
5. **AI generates the blueprint:**
   - Product Requirements Document (PRD)
   - User Stories
   - Database Schema
   - API Architecture
   - Page Map & Component Map
   - Deployment Plan
6. **Review scope** — approve, edit, or request changes before code generation begins.
7. **AI generates the application** — all agents collaborate to produce production code.
8. **Preview** — inspect the running app in a sandboxed preview environment.
9. **Deploy** — push to your cloud provider with one click.
10. **Collaborate** — invite developers or agencies to take over or extend.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 15, React 19, TypeScript, Tailwind CSS, shadcn/ui, Framer Motion |
| **Backend** | NestJS, TypeScript, PostgreSQL, Drizzle ORM |
| **Auth** | Clerk (multi-tenant, organizations) |
| **AI** | OpenAI, Anthropic Claude, Google Gemini |
| **Memory** | PostgreSQL + pgvector |
| **Payments** | Stripe |
| **Monitoring** | Sentry, OpenTelemetry |
| **Infrastructure** | Vercel, AWS, Google Cloud, Cloudflare |

---

## Architecture

DeVibe uses a monorepo layout with clearly separated apps and shared packages.

```
devibe/
├── apps/
│   ├── web/          # Next.js 15 frontend
│   ├── api/          # NestJS backend
│   └── workers/      # BullMQ background workers
├── packages/
│   ├── agents/       # AI agent orchestration
│   ├── ui/           # Shared component library (shadcn/ui)
│   ├── database/     # Drizzle ORM schema & migrations
│   ├── auth/         # Clerk integration & RBAC helpers
│   ├── billing/      # Stripe integration
│   ├── ai/           # OpenAI / Anthropic / Gemini adapters
│   ├── deployment/   # Cloud provider adapters
│   └── analytics/    # Usage tracking & audit logs
└── devibe-mcp-server/ # MCP server — idea-to-production protocol
```

---

## AI Agent System

Each agent accepts structured context, produces structured JSON outputs, stores memory in pgvector, and writes audit logs.

| # | Agent | Responsibility |
|---|---|---|
| 1 | **Product Manager** | PRD, user stories, scope definition |
| 2 | **UX** | Information architecture, user flows, wireframes |
| 3 | **UI** | Design tokens, component specs, accessibility |
| 4 | **Frontend** | React/Next.js components, routing, state |
| 5 | **Backend** | API endpoints, business logic, services |
| 6 | **Database** | Schema design, migrations, query optimization |
| 7 | **DevOps** | Infrastructure-as-code, CI/CD, cloud deployment |
| 8 | **QA** | Test plans, automated tests, coverage reports |
| 9 | **Security** | Threat modeling, vulnerability scanning, hardening |
| 10 | **Documentation** | README files, API docs, developer handoff |

---

## Pages

| Page | Description |
|---|---|
| Landing | Marketing & onboarding |
| Dashboard | Project overview & metrics |
| Projects | Project list & management |
| Chat Builder | Conversational app creation interface |
| PRD Generator | AI-generated product requirements |
| Database Designer | Visual schema builder |
| API Designer | Endpoint & contract designer |
| Preview Environment | Live sandboxed preview |
| Deployments | Deployment history & controls |
| Marketplace | Templates & integrations |
| Templates | Starter blueprints |
| Settings | Org & user settings |
| Billing | Stripe subscription management |
| Admin | Platform administration |

---

## Cloud Infrastructure

DeVibe ships infrastructure adapters for every major cloud provider.

**AWS**
- ECS (containerized services)
- Lambda (serverless functions)
- S3 (static assets & file storage)
- RDS (managed PostgreSQL)

**Google Cloud**
- Cloud Run (containerized services)
- Cloud SQL (managed PostgreSQL)
- Vertex AI (Gemini models)

**Azure**
- Azure App Service
- Azure OpenAI

**Cloudflare**
- Workers (edge compute)
- R2 (object storage)
- D1 (edge SQLite)

---

## Getting Started

### Prerequisites

- Node.js ≥ 20
- PostgreSQL ≥ 16
- Redis (for BullMQ workers)

### 1. Clone & install

```bash
git clone https://github.com/De-vibe-Labs/devibe.git
cd devibe
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in the required values — see [Environment Variables](#environment-variables) below.

### 3. Run database migrations

```bash
cd devibe-mcp-server
npm run db:migrate
```

### 4. Start the development server

```bash
# From the repo root
npm run dev
```

The app will be available at `http://localhost:5173`.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | ✅ | Google Gemini API key |
| `APP_URL` | ✅ | Public URL of the deployed app |
| `GITHUB_CLIENT_ID` | ✅ | GitHub OAuth app client ID |
| `GITHUB_CLIENT_SECRET` | ✅ | GitHub OAuth app client secret |
| `VITE_PRIVY_APP_ID` | Optional | Privy app ID (alternative auth) |
| `GEMINI_MODEL` | Optional | Override default Gemini model (`gemini-2.5-flash`) |
| `VITE_FIREBASE_API_KEY` | Optional | Firebase API key override |
| `VITE_FIREBASE_AUTH_DOMAIN` | Optional | Firebase auth domain override |
| `VITE_FIREBASE_PROJECT_ID` | Optional | Firebase project ID override |

See `.env.example` for the full list.

---

## Scripts

### Root

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | TypeScript type checking |
| `npm run clean` | Remove build artifacts |

### MCP Server (`devibe-mcp-server/`)

| Command | Description |
|---|---|
| `npm run dev` | Start MCP server with hot reload |
| `npm run build` | Compile TypeScript |
| `npm run test` | Run Vitest tests |
| `npm run db:generate` | Generate Drizzle migrations |
| `npm run db:migrate` | Apply migrations |
| `npm run db:push` | Push schema to database |
| `npm run worker` | Start BullMQ background worker |

---

## Code Quality

- **Strict TypeScript** — no `any` types.
- **Production-ready** — scalable to millions of users.
- **Security-first** — threat modeling at every layer.
- **Accessibility** — WCAG 2.1 AA compliance target.
- **Mobile responsive** — all pages work on mobile.
- **Full test coverage** — unit, integration, and e2e.
- **Clean folder structure** — every file has a clear home.

---

## Features

- ✅ Multi-tenant organizations
- ✅ Project workspaces
- ✅ Real-time chat
- ✅ AI orchestration
- ✅ GitHub integration
- ✅ Deployment management
- ✅ Team collaboration
- ✅ Usage tracking & audit logs
- ✅ Stripe billing
- ✅ Vector memory (pgvector)
- ✅ Export functionality
- ✅ MCP server (Model Context Protocol)

---

## Contributing

1. Fork the repository.
2. Create a feature branch: `git checkout -b feat/your-feature`.
3. Commit your changes: `git commit -m "feat: add your feature"`.
4. Push and open a pull request.

Please read [SECURITY.md](SECURITY.md) before reporting vulnerabilities.

---

## License

MIT © [De-vibe Labs](https://github.com/De-vibe-Labs)
