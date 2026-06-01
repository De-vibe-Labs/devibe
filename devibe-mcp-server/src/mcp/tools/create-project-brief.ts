import { z } from "zod";
import { defineTool } from "./base.js";
import { generateJson } from "../../services/ai.js";
import { productAgent } from "../agents/product.agent.js";
import { getDb, isDbConfigured } from "../../db/client.js";
import { projects } from "../../db/schema.js";
import { newProjectId } from "../../utils/ids.js";
import { recordAudit } from "../../db/repo.js";

const projectTypes = [
  "website",
  "saas",
  "ai_tool",
  "mobile_app",
  "blockchain",
  "e_commerce",
  "marketplace",
  "business_software",
  "custom",
] as const;

const inputSchema = {
  idea: z.string().min(10).describe("The raw user idea, in their own words."),
  type: z.enum(projectTypes).optional().describe("Product type, if known."),
  audience: z.string().optional().describe("Optional hint about the target audience."),
  persist: z.boolean().default(true).describe("Persist a project record when a database is configured."),
};

interface Brief {
  productSummary: string;
  targetUsers: string[];
  problem: string;
  solution: string;
  mvpScope: string[];
  businessModel: string;
  suggestedType: (typeof projectTypes)[number];
  suggestedName: string;
}

export const createProjectBrief = defineTool({
  name: "create_project_brief",
  title: "Create Project Brief",
  description:
    "Turn a raw idea into a structured product brief: summary, target users, problem, solution, " +
    "MVP scope, and business model.",
  inputSchema,
  async handler(args, ctx) {
    const fallback: Brief = {
      productSummary: args.idea.trim().slice(0, 280),
      targetUsers: [args.audience ?? "Early adopters in the target market"],
      problem: "Users lack a fast, affordable way to achieve the stated goal.",
      solution: "An AI-assisted product that delivers the core outcome with minimal setup.",
      mvpScope: ["Core workflow", "Authentication", "Basic dashboard", "Payments (if applicable)"],
      businessModel: "Subscription (SaaS) with a free tier and usage-based upgrades.",
      suggestedType: args.type ?? "custom",
      suggestedName: "Untitled Project",
    };

    const prompt = `Idea: ${args.idea}\nType hint: ${args.type ?? "unknown"}\nAudience hint: ${
      args.audience ?? "unknown"
    }\nReturn JSON with keys: productSummary, targetUsers (array), problem, solution, mvpScope (array), businessModel, suggestedType (one of ${projectTypes.join(
      ", ",
    )}), suggestedName.`;

    const { data: brief, source } = await generateJson<Brief>(prompt, fallback, {
      system: productAgent.systemPrompt,
    });

    let projectId: string | undefined;
    if (args.persist && isDbConfigured()) {
      projectId = newProjectId();
      await getDb()
        .insert(projects)
        .values({
          id: projectId,
          ownerId: ctx.actorId,
          name: brief.suggestedName,
          description: brief.productSummary,
          type: brief.suggestedType,
          status: "draft",
          brief,
        });
      await recordAudit({
        actorId: ctx.actorId,
        action: "create_project_brief",
        resourceType: "project",
        resourceId: projectId,
      });
    }

    return { projectId, brief, generatedBy: source, agent: productAgent.role };
  },
});
