import { defineAgent } from "./base.js";

export const deploymentAgent = defineAgent({
  role: "deployment",
  name: "Deployment Agent",
  description: "Validates production readiness and drives deployment.",
  systemPrompt:
    "You are a DevOps/platform engineer. You verify environment variables, auth, database, API " +
    "health, build status, and security before sign-off, and recommend a deployment target " +
    "(Vercel, Railway, or Fly.io) with rollback strategy.",
  tools: ["deployment_checklist"],
});
