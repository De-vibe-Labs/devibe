import { z } from "zod";
import { defineTool } from "./base.js";
import { getDb, isDbConfigured } from "../../db/client.js";
import { projects, tasks as tasksTable, handoffPacks } from "../../db/schema.js";
import { eq } from "drizzle-orm";
import { newHandoffId } from "../../utils/ids.js";
import { recordAudit } from "../../db/repo.js";
import { handoffAgent } from "../agents/handoff.agent.js";

const inputSchema = {
  projectId: z.string().optional(),
  jobId: z.string().optional(),
  projectContext: z.string().optional().describe("Context if no projectId is supplied."),
  githubRepo: z.string().optional(),
  budget: z.number().positive().optional(),
  timelineWeeks: z.number().int().positive().optional(),
  requiredFiles: z.array(z.string()).optional(),
  persist: z.boolean().default(true),
};

export const generateHandoffPack = defineTool({
  name: "generate_handoff_pack",
  title: "Generate Handoff Pack",
  description:
    "Create a developer handoff pack: project context, task brief, GitHub links, required files, " +
    "acceptance criteria, budget, and timeline.",
  inputSchema,
  async handler(args, ctx) {
    let projectContext = args.projectContext ?? "";
    let taskBrief: Array<{ title: string; acceptanceCriteria: string[] }> = [];
    let githubRepo = args.githubRepo;

    if (args.projectId && isDbConfigured()) {
      const [project] = await getDb().select().from(projects).where(eq(projects.id, args.projectId));
      if (project) {
        projectContext =
          projectContext ||
          JSON.stringify({ name: project.name, description: project.description, type: project.type });
        githubRepo = githubRepo ?? project.githubRepo ?? undefined;
      }
      const rows = await getDb().select().from(tasksTable).where(eq(tasksTable.projectId, args.projectId));
      taskBrief = rows.map((r) => ({ title: r.title, acceptanceCriteria: r.acceptanceCriteria }));
    }

    const contents = {
      projectContext: projectContext || "No project context supplied.",
      taskBrief,
      githubLinks: githubRepo
        ? {
            repo: githubRepo.startsWith("http") ? githubRepo : `https://github.com/${githubRepo}`,
            issues: githubRepo.startsWith("http") ? `${githubRepo}/issues` : `https://github.com/${githubRepo}/issues`,
          }
        : null,
      requiredFiles: args.requiredFiles ?? [],
      acceptanceCriteria: taskBrief.flatMap((t) => t.acceptanceCriteria),
      budget: args.budget ?? null,
      timelineWeeks: args.timelineWeeks ?? null,
    };

    let handoffId: string | undefined;
    if (args.persist && args.projectId && isDbConfigured()) {
      handoffId = newHandoffId();
      await getDb()
        .insert(handoffPacks)
        .values({
          id: handoffId,
          projectId: args.projectId,
          jobId: args.jobId ?? null,
          contents,
          budget: args.budget ?? null,
          timelineWeeks: args.timelineWeeks ?? null,
        });
      await recordAudit({
        actorId: ctx.actorId,
        action: "generate_handoff_pack",
        resourceType: "handoff_pack",
        resourceId: handoffId,
      });
    }

    return { handoffId, projectId: args.projectId, handoffPack: contents, agent: handoffAgent.role };
  },
});
