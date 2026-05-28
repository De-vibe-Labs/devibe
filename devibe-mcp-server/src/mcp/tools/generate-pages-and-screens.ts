import { z } from "zod";
import { defineTool } from "./base.js";
import { generateJson } from "../../services/ai.js";
import { designAgent } from "../agents/design.agent.js";
import { getDb, isDbConfigured } from "../../db/client.js";
import { projects } from "../../db/schema.js";
import { eq } from "drizzle-orm";
import { recordAudit } from "../../db/repo.js";

const surfaces = [
  "website",
  "mobile_app",
  "admin_dashboard",
  "saas_app",
  "ai_tool",
  "blockchain_app",
] as const;

const inputSchema = {
  projectId: z.string().optional(),
  surface: z.enum(surfaces).describe("Which surface to generate screens for."),
  context: z.string().optional().describe("Product context if no projectId is supplied."),
};

interface Screen {
  name: string;
  route: string;
  purpose: string;
  components: string[];
  primaryAction: string;
}

interface PagesResult {
  surface: (typeof surfaces)[number];
  navigation: string[];
  screens: Screen[];
}

export const generatePagesAndScreens = defineTool({
  name: "generate_pages_and_screens",
  title: "Generate Pages and Screens",
  description:
    "Create the full set of pages/screens for a website, mobile app, admin dashboard, SaaS app, AI " +
    "tool, or blockchain app — with routes, components, and primary actions.",
  inputSchema,
  async handler(args, ctx) {
    let context = args.context ?? "";
    if (args.projectId && isDbConfigured()) {
      const [project] = await getDb().select().from(projects).where(eq(projects.id, args.projectId));
      if (project) context = JSON.stringify({ name: project.name, type: project.type, prd: project.prd });
    }

    const fallback: PagesResult = {
      surface: args.surface,
      navigation: ["Home", "Features", "Pricing", "Dashboard", "Settings"],
      screens: [
        {
          name: "Landing",
          route: "/",
          purpose: "Convert visitors",
          components: ["Hero", "Feature grid", "Pricing", "CTA"],
          primaryAction: "Sign up",
        },
        {
          name: "Dashboard",
          route: "/dashboard",
          purpose: "Core workspace",
          components: ["Sidebar", "Stats", "Activity feed"],
          primaryAction: "Create new",
        },
        {
          name: "Settings",
          route: "/settings",
          purpose: "Manage account",
          components: ["Profile form", "Billing", "Security"],
          primaryAction: "Save",
        },
      ],
    };

    const prompt = `Surface: ${args.surface}\nContext: ${context}\nReturn JSON: { surface, navigation[], screens[{name, route, purpose, components[], primaryAction}] } tailored to the surface.`;

    const { data: result, source } = await generateJson<PagesResult>(prompt, fallback, {
      system: designAgent.systemPrompt,
    });

    if (args.projectId && isDbConfigured()) {
      await getDb()
        .update(projects)
        .set({ pages: result, updatedAt: new Date() })
        .where(eq(projects.id, args.projectId));
      await recordAudit({
        actorId: ctx.actorId,
        action: "generate_pages_and_screens",
        resourceType: "project",
        resourceId: args.projectId,
        metadata: { surface: args.surface },
      });
    }

    return { projectId: args.projectId, ...result, generatedBy: source, agent: designAgent.role };
  },
});
