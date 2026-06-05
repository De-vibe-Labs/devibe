# Devibe

Devibe is an AI-first product development workspace for founders and builders.  
It combines prompt-based app generation, live in-browser editing, and developer marketplace workflows in one platform.

## What this repository contains

This repository has two main parts:

1. **Devibe web app (root project)**  
   A React + Vite frontend with an Express backend that powers:
   - idea-to-app generation with Gemini
   - iterative AI refinement
   - built-in IDE and preview workflows
   - GitHub connection and push flows
   - founder/developer marketplace interactions

2. **Devibe MCP Server (`devibe-mcp-server/`)**  
   A standalone, production-oriented MCP server with tool routing and multi-agent orchestration for software planning and delivery workflows.

## High-level product flow

1. A user describes an idea in natural language.
2. Devibe generates a structured output (PRD, schema, code snippets, tasks, agent logs).
3. The user iterates through refinement chat.
4. The user can edit generated code in the built-in IDE.
5. Work can be routed to developers or synced to GitHub.

## Tech stack

- **Frontend:** React, TypeScript, Vite, Tailwind, Monaco, Sandpack
- **Backend:** Node.js, Express, TypeScript
- **AI:** Google Gemini (`@google/genai`) with fallback generation behavior
- **Auth/Identity:** Firebase Auth (+ optional Privy integration in UI)
- **Integrations:** GitHub OAuth/API, referral tracking endpoints

## Getting started (root app)

### Prerequisites

- Node.js 20+ (recommended)

### Install

```bash
npm install
```

### Configure

Create a `.env` file (or use your existing environment setup) and set at minimum:

- `GEMINI_API_KEY` (required for live AI generation)
- `GEMINI_MODEL` (optional, defaults to `gemini-2.5-flash`)
- GitHub OAuth vars for real GitHub auth:
  - `GITHUB_CLIENT_ID`
  - `GITHUB_CLIENT_SECRET`
- `APP_URL` (optional; used for OAuth callback URL generation)

### Run in development

```bash
npm run dev
```

### Build and run production

```bash
npm run build
npm run start
```

### Type-check

```bash
npm run lint
```

## Scripts (root project)

- `npm run dev` — start Express + Vite in dev mode
- `npm run build` — build frontend and bundle server
- `npm run start` — run compiled server from `dist/server.cjs`
- `npm run clean` — remove build output
- `npm run lint` — TypeScript type check (`tsc --noEmit`)

## MCP server docs

For architecture, tools, and setup of the MCP service, see:  
`devibe-mcp-server/README.md`
