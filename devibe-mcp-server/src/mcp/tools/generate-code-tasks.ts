import { z } from "zod";
import { defineTool } from "./base.js";
import { generateJson } from "../../services/ai.js";
import { frontendAgent } from "../agents/frontend.agent.js";
import { getDb, isDbConfigured } from "../../db/client.js";
import { projects, tasks as tasksTable } from "../../db/schema.js";
import { eq } from "drizzle-orm";
import { newTaskId } from "../../utils/ids.js";
import { recordAudit } from "../../db/repo.js";

const inputSchema = {
  projectId: z.string().optional(),
  context: z.string().optional().describe("Architecture/PRD context if no projectId is supplied."),
  maxTasks: z.number().int().min(1).max(50).default(12),
  persist: z.boolean().default(true),
};

interface GeneratedTask {
  title: string;
  description: string;
  priority: "low" | "medium" | "high" | "critical";
  stack: string[];
  files: string[];
  acceptanceCriteria: string[];
  estimateHours: number;
}

export const generateCodeTasks = defineTool({
  name: "generate_code_tasks",
  title: "Generate Code Tasks",
  description:
    "Break a project into developer-ready tasks with title, description, priority, tech stack, " +
    "files involved, and acceptance criteria.",
  inputSchema,
  async handler(args, ctx) {
    let context = args.context ?? "";
    let projectExists = false;
    if (args.projectId && isDbConfigured()) {
      const [project] = await getDb().select().from(projects).where(eq(projects.id, args.projectId));
      if (project) {
        projectExists = true;
        context = JSON.stringify({ name: project.name, prd: project.prd, architecture: project.architecture });
      }
    }

    const fallback = ([
      {
        title: "Scaffold project & CI",
        description: "Initialize repo, tooling, linting, and CI pipeline.",
        priority: "high",
        stack: ["TypeScript", "GitHub Actions"],
        files: ["package.json", ".github/workflows/ci.yml", "tsconfig.json"],
        acceptanceCriteria: ["CI runs on PRs", "Lint and typecheck pass"],
        estimateHours: 4,
      },
      {
        title: "Implement authentication",
        description: "Add sign up / sign in with sessions and protected routes.",
        priority: "critical",
        stack: ["Clerk", "Next.js"],
        files: ["app/(auth)/*", "middleware.ts"],
        acceptanceCriteria: ["Users can sign up and in", "Protected routes redirect"],
        estimateHours: 8,
      },
      {
        title: "Build dashboard",
        description: "Core workspace with data fetching and empty states.",
        priority: "high",
        stack: ["Next.js", "Tailwind"],
        files: ["app/dashboard/page.tsx", "components/Dashboard.tsx"],
        acceptanceCriteria: ["Loads user data", "Handles loading & empty states"],
        estimateHours: 10,
      },
    ] satisfies GeneratedTask[]).slice(0, args.maxTasks);

    const prompt = `Context: ${context}\nGenerate up to ${args.maxTasks} developer-ready tasks. Return a JSON array of {title, description, priority(low|medium|high|critical), stack[], files[], acceptanceCriteria[], estimateHours(number)}.`;

    const { data: generated, source } = await generateJson<GeneratedTask[]>(prompt, fallback, {
      system: frontendAgent.systemPrompt,
    });

    const list = Array.isArray(generated) ? generated.slice(0, args.maxTasks) : fallback;

    let persistedIds: string[] = [];
    if (args.persist && projectExists && isDbConfigured()) {
      const rows = list.map((t) => ({
        id: newTaskId(),
        projectId: args.projectId!,
        title: t.title,
        description: t.description,
        priority: t.priority,
        stack: t.stack ?? [],
        files: t.files ?? [],
        acceptanceCriteria: t.acceptanceCriteria ?? [],
        estimateHours: t.estimateHours ?? null,
      }));
      await getDb().insert(tasksTable).values(rows);
      persistedIds = rows.map((r) => r.id);
      await recordAudit({
        actorId: ctx.actorId,
        action: "generate_code_tasks",
        resourceType: "project",
        resourceId: args.projectId,
        metadata: { count: rows.length },
      });
    }

    return {
      projectId: args.projectId,
      tasks: list,
      persistedTaskIds: persistedIds,
      generatedBy: source,
      agent: frontendAgent.role,
    };
  },
});
