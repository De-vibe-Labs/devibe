import { z } from "zod";
import { defineTool } from "./base.js";
import { rankDevelopers, type MatchCriteria } from "../../services/marketplace.js";
import { getDb, isDbConfigured } from "../../db/client.js";
import { developerProfiles, type DeveloperProfile } from "../../db/schema.js";
import { recordAudit } from "../../db/repo.js";
import { handoffAgent } from "../agents/handoff.agent.js";

const devTypes = [
  "freelancer",
  "dev_house",
  "frontend",
  "backend",
  "mobile",
  "blockchain",
  "ai_engineer",
] as const;

const inputSchema = {
  requiredSkills: z.array(z.string()).min(1),
  budget: z.number().positive().optional().describe("Total budget in USD."),
  minRating: z.number().min(0).max(5).optional(),
  preferredType: z.enum(devTypes).optional(),
  limit: z.number().int().min(1).max(20).default(5),
  candidates: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        title: z.string().default(""),
        type: z.enum(devTypes).default("freelancer"),
        skills: z.array(z.string()).default([]),
        hourlyRate: z.number().default(0),
        rating: z.number().default(0),
        completedJobs: z.number().default(0),
        availability: z.enum(["high", "medium", "low"]).default("medium"),
      }),
    )
    .optional()
    .describe("Inline candidate pool; falls back to the database when omitted."),
};

export const matchDeveloper = defineTool({
  name: "match_developer",
  title: "Match Developer",
  description:
    "Match work to freelancers or dev houses (frontend, backend, mobile, blockchain, AI) by skills, " +
    "budget, rating, and availability.",
  inputSchema,
  async handler(args, ctx) {
    let pool: DeveloperProfile[] = [];

    if (args.candidates && args.candidates.length > 0) {
      pool = args.candidates.map((c) => ({
        id: c.id,
        name: c.name,
        title: c.title,
        type: c.type,
        skills: c.skills,
        hourlyRate: c.hourlyRate,
        rating: c.rating,
        completedJobs: c.completedJobs,
        availability: c.availability,
        githubUrl: null,
        verified: false,
        createdAt: new Date(),
      }));
    } else if (isDbConfigured()) {
      pool = await getDb().select().from(developerProfiles);
    }

    const criteria: MatchCriteria = {
      requiredSkills: args.requiredSkills,
      budget: args.budget,
      minRating: args.minRating,
      preferredType: args.preferredType,
    };

    const ranked = rankDevelopers(pool, criteria).slice(0, args.limit);

    await recordAudit({
      actorId: ctx.actorId,
      action: "match_developer",
      resourceType: "marketplace",
      metadata: { skills: args.requiredSkills, results: ranked.length },
    });

    return {
      matches: ranked.map((r) => ({
        developerId: r.developer.id,
        name: r.developer.name,
        type: r.developer.type,
        score: r.score,
        reasons: r.reasons,
      })),
      poolSize: pool.length,
      agent: handoffAgent.role,
    };
  },
});
