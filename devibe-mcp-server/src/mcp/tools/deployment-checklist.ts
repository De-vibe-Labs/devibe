import { z } from "zod";
import { defineTool } from "./base.js";
import { evaluateReadiness, type Provider } from "../../services/deployment.js";
import { getDb, isDbConfigured } from "../../db/client.js";
import { deployments } from "../../db/schema.js";
import { newDeploymentId } from "../../utils/ids.js";
import { recordAudit } from "../../db/repo.js";
import { deploymentAgent } from "../agents/deployment.agent.js";

const inputSchema = {
  projectId: z.string().optional(),
  provider: z.enum(["vercel", "railway", "fly"]).default("vercel"),
  envVars: z.array(z.string()).default([]).describe("Names of configured environment variables."),
  hasAuth: z.boolean().default(false),
  hasDatabase: z.boolean().default(false),
  apiHealthUrl: z.string().url().optional(),
  buildPassing: z.boolean().default(false),
  securityReviewed: z.boolean().default(false),
  persist: z.boolean().default(true),
};

export const deploymentChecklist = defineTool({
  name: "deployment_checklist",
  title: "Deployment Checklist",
  description:
    "Check production readiness: environment variables, auth, database, API health, build status, " +
    "and security. Returns a scored checklist.",
  inputSchema,
  async handler(args, ctx) {
    const readiness = evaluateReadiness({
      provider: args.provider as Provider,
      envVars: args.envVars,
      hasAuth: args.hasAuth,
      hasDatabase: args.hasDatabase,
      apiHealthUrl: args.apiHealthUrl,
      buildPassing: args.buildPassing,
      securityReviewed: args.securityReviewed,
    });

    let deploymentId: string | undefined;
    if (args.persist && args.projectId && isDbConfigured()) {
      deploymentId = newDeploymentId();
      await getDb()
        .insert(deployments)
        .values({
          id: deploymentId,
          projectId: args.projectId,
          provider: args.provider,
          status: readiness.ready ? "pending" : "failed",
          checklist: readiness,
        });
      await recordAudit({
        actorId: ctx.actorId,
        action: "deployment_checklist",
        resourceType: "deployment",
        resourceId: deploymentId,
        metadata: { ready: readiness.ready, score: readiness.score },
      });
    }

    return { deploymentId, ...readiness, agent: deploymentAgent.role };
  },
});
