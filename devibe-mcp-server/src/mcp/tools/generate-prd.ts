import { z } from "zod";
import { defineTool } from "./base.js";
import { generateJson } from "../../services/ai.js";
import { productAgent } from "../agents/product.agent.js";
import { getDb, isDbConfigured } from "../../db/client.js";
import { projects } from "../../db/schema.js";
import { eq } from "drizzle-orm";
import { recordAudit } from "../../db/repo.js";
import { NotFoundError } from "../../utils/errors.js";

const inputSchema = {
  projectId: z.string().optional().describe("Existing project id to attach the PRD to."),
  idea: z.string().optional().describe("Idea or brief text, if no projectId is supplied."),
};

interface PRD {
  overview: string;
  features: Array<{ name: string; description: string; complexity: "low" | "medium" | "high" }>;
  userStories: Array<{ as: string; want: string; soThat: string }>;
  pages: string[];
  dataModels: Array<{ name: string; fields: string[] }>;
  apiRequirements: Array<{ method: string; path: string; purpose: string }>;
  successMetrics: string[];
}

export const generatePrd = defineTool({
  name: "generate_prd",
  title: "Generate PRD",
  description:
    "Create a full PRD: features, user stories, pages/screens, data models, API requirements, and " +
    "success metrics. Accepts a projectId or raw idea text.",
  inputSchema,
  async handler(args, ctx) {
    let context = args.idea ?? "";
    if (args.projectId && isDbConfigured()) {
      const [project] = await getDb().select().from(projects).where(eq(projects.id, args.projectId));
      if (!project) throw new NotFoundError("Project");
      context = JSON.stringify({ name: project.name, description: project.description, brief: project.brief });
    }
    if (!context) context = "A generic SaaS product.";

    const fallback: PRD = {
      overview: "Product requirements for the described product.",
      features: [
        { name: "User accounts", description: "Sign up, sign in, profile management.", complexity: "low" },
        { name: "Core workflow", description: "The primary value-delivering flow.", complexity: "high" },
        { name: "Billing", description: "Subscription and payment handling.", complexity: "medium" },
      ],
      userStories: [
        { as: "a new user", want: "to sign up quickly", soThat: "I can start using the product" },
        { as: "a returning user", want: "to resume my work", soThat: "I stay productive" },
      ],
      pages: ["Landing", "Sign up", "Dashboard", "Settings", "Billing"],
      dataModels: [
        { name: "User", fields: ["id", "email", "name", "createdAt"] },
        { name: "Subscription", fields: ["id", "userId", "plan", "status"] },
      ],
      apiRequirements: [
        { method: "POST", path: "/auth/signup", purpose: "Create an account" },
        { method: "GET", path: "/me", purpose: "Fetch current user" },
      ],
      successMetrics: ["Activation rate", "D7 retention", "MRR", "NPS"],
    };

    const prompt = `Context: ${context}\nReturn a PRD as JSON with keys: overview, features (name, description, complexity), userStories (as, want, soThat), pages (array), dataModels (name, fields[]), apiRequirements (method, path, purpose), successMetrics (array).`;

    const { data: prd, source } = await generateJson<PRD>(prompt, fallback, {
      system: productAgent.systemPrompt,
    });

    if (args.projectId && isDbConfigured()) {
      await getDb().update(projects).set({ prd, updatedAt: new Date() }).where(eq(projects.id, args.projectId));
      await recordAudit({
        actorId: ctx.actorId,
        action: "generate_prd",
        resourceType: "project",
        resourceId: args.projectId,
      });
    }

    return { projectId: args.projectId, prd, generatedBy: source, agent: productAgent.role };
  },
});
