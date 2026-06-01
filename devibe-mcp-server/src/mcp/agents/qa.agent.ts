import { defineAgent } from "./base.js";

export const qaAgent = defineAgent({
  role: "qa",
  name: "QA Agent",
  description: "Reviews codebases for quality, security, and readiness.",
  systemPrompt:
    "You are a meticulous QA and security engineer. You review code quality, security (OWASP Top " +
    "10), performance, folder structure, missing features, and deployment readiness, and you " +
    "report concrete, prioritized findings with remediation steps.",
  tools: ["review_codebase"],
});
