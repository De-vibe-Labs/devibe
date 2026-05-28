import { z } from "zod";
import { defineTool } from "./base.js";
import { generateJson } from "../../services/ai.js";
import { qaAgent } from "../agents/qa.agent.js";
import { recordAudit } from "../../db/repo.js";

const inputSchema = {
  projectId: z.string().optional(),
  repo: z.string().optional().describe('GitHub "owner/repo" or URL.'),
  codeSnippet: z.string().optional().describe("Optional code/diff to review directly."),
  focus: z
    .array(z.enum(["quality", "security", "performance", "structure", "features", "deployment"]))
    .optional(),
};

interface Finding {
  category: "quality" | "security" | "performance" | "structure" | "features" | "deployment";
  severity: "info" | "low" | "medium" | "high" | "critical";
  finding: string;
  recommendation: string;
}

interface Review {
  summary: string;
  score: number;
  findings: Finding[];
  deploymentReady: boolean;
}

export const reviewCodebase = defineTool({
  name: "review_codebase",
  title: "Review Codebase",
  description:
    "Review a codebase for code quality, security, performance, folder structure, missing " +
    "features, and deployment readiness.",
  inputSchema,
  async handler(args, ctx) {
    const fallback: Review = {
      summary: "Baseline review. Provide a repo or code snippet for a deeper, specific analysis.",
      score: 70,
      findings: [
        {
          category: "security",
          severity: "high",
          finding: "Inputs may not be validated at all boundaries.",
          recommendation: "Validate every external input with a schema (e.g. zod).",
        },
        {
          category: "structure",
          severity: "low",
          finding: "Folder structure conventions unclear.",
          recommendation: "Adopt a consistent feature-based layout.",
        },
        {
          category: "deployment",
          severity: "medium",
          finding: "No documented deployment checklist.",
          recommendation: "Add env var, build, and health-check verification before deploy.",
        },
      ],
      deploymentReady: false,
    };

    const prompt = `Review target. Repo: ${args.repo ?? "n/a"}. Focus: ${
      args.focus?.join(", ") ?? "all"
    }.\nCode snippet:\n${(args.codeSnippet ?? "").slice(0, 8000)}\nReturn JSON: {summary, score(0-100), findings[{category, severity, finding, recommendation}], deploymentReady(boolean)}.`;

    const { data: review, source } = await generateJson<Review>(prompt, fallback, {
      system: qaAgent.systemPrompt,
    });

    await recordAudit({
      actorId: ctx.actorId,
      action: "review_codebase",
      resourceType: "project",
      resourceId: args.projectId ?? null,
      metadata: { repo: args.repo },
    });

    return { projectId: args.projectId, review, generatedBy: source, agent: qaAgent.role };
  },
});
