import { z } from "zod";
import { defineTool } from "./base.js";
import { generateJson } from "../../services/ai.js";
import { backendAgent } from "../agents/backend.agent.js";
import { getDb, isDbConfigured } from "../../db/client.js";
import { projects } from "../../db/schema.js";
import { eq } from "drizzle-orm";
import { recordAudit } from "../../db/repo.js";
import { NotFoundError } from "../../utils/errors.js";

const inputSchema = {
  projectId: z.string().optional(),
  prd: z.string().optional().describe("PRD text or summary, if no projectId is supplied."),
  preferences: z
    .object({
      frontend: z.string().optional(),
      backend: z.string().optional(),
      database: z.string().optional(),
    })
    .optional(),
};

interface Architecture {
  frontend: { framework: string; structure: string[]; notes: string };
  backend: { framework: string; services: string[]; notes: string };
  databaseSchema: Array<{ table: string; columns: string[] }>;
  apiStructure: Array<{ method: string; path: string; auth: boolean; purpose: string }>;
  auth: { provider: string; strategy: string };
  deploymentPlan: { target: string; steps: string[] };
  securityChecklist: string[];
}

export const generateAppArchitecture = defineTool({
  name: "generate_app_architecture",
  title: "Generate App Architecture",
  description:
    "Produce frontend, backend, database schema, API structure, auth setup, deployment plan, and a " +
    "security checklist for a project.",
  inputSchema,
  async handler(args, ctx) {
    let context = args.prd ?? "";
    if (args.projectId && isDbConfigured()) {
      const [project] = await getDb().select().from(projects).where(eq(projects.id, args.projectId));
      if (!project) throw new NotFoundError("Project");
      context = JSON.stringify({ name: project.name, type: project.type, prd: project.prd });
    }

    const fallback: Architecture = {
      frontend: {
        framework: args.preferences?.frontend ?? "Next.js + TypeScript + Tailwind",
        structure: ["app/ (routes)", "components/", "lib/", "hooks/", "styles/"],
        notes: "Server components by default; client components for interactivity.",
      },
      backend: {
        framework: args.preferences?.backend ?? "Hono + TypeScript on Node.js",
        services: ["auth", "billing", "core domain", "background jobs"],
        notes: "Layered services with clear boundaries; jobs offloaded to a queue.",
      },
      databaseSchema: [
        { table: "users", columns: ["id", "email", "name", "created_at"] },
        { table: "subscriptions", columns: ["id", "user_id", "plan", "status"] },
      ],
      apiStructure: [
        { method: "POST", path: "/auth/login", auth: false, purpose: "Authenticate" },
        { method: "GET", path: "/me", auth: true, purpose: "Current user" },
      ],
      auth: { provider: args.preferences?.database ? "Clerk" : "Clerk", strategy: "JWT sessions + RBAC" },
      deploymentPlan: {
        target: "Vercel (frontend) + Railway (backend/DB)",
        steps: ["Provision DB", "Set env vars", "Deploy backend", "Deploy frontend", "Smoke test"],
      },
      securityChecklist: [
        "Validate all inputs at the boundary",
        "Use parameterized queries / ORM",
        "Enforce authz on every endpoint",
        "Rotate and scope secrets",
        "Enable rate limiting",
        "Set security headers (CSP, HSTS)",
      ],
    };

    const prompt = `Context: ${context}\nPreferences: ${JSON.stringify(
      args.preferences ?? {},
    )}\nReturn architecture JSON with keys: frontend{framework,structure[],notes}, backend{framework,services[],notes}, databaseSchema[{table,columns[]}], apiStructure[{method,path,auth,purpose}], auth{provider,strategy}, deploymentPlan{target,steps[]}, securityChecklist[].`;

    const { data: architecture, source } = await generateJson<Architecture>(prompt, fallback, {
      system: backendAgent.systemPrompt,
    });

    if (args.projectId && isDbConfigured()) {
      await getDb()
        .update(projects)
        .set({ architecture, updatedAt: new Date() })
        .where(eq(projects.id, args.projectId));
      await recordAudit({
        actorId: ctx.actorId,
        action: "generate_app_architecture",
        resourceType: "project",
        resourceId: args.projectId,
      });
    }

    return { projectId: args.projectId, architecture, generatedBy: source, agent: backendAgent.role };
  },
});
