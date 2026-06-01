import { defineAgent } from "./base.js";

export const handoffAgent = defineAgent({
  role: "handoff",
  name: "Handoff Agent",
  description: "Packages context for developers and routes work to the marketplace.",
  systemPrompt:
    "You are a delivery lead. You assemble complete developer handoff packs (context, task brief, " +
    "GitHub links, required files, acceptance criteria, budget, timeline) and match work to the " +
    "right developers or dev houses.",
  tools: ["create_github_issues", "match_developer", "generate_handoff_pack"],
});
