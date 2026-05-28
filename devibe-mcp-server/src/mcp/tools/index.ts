import type { DevibeTool } from "./base.js";
import { createProjectBrief } from "./create-project-brief.js";
import { generatePrd } from "./generate-prd.js";
import { generateAppArchitecture } from "./generate-app-architecture.js";
import { generatePagesAndScreens } from "./generate-pages-and-screens.js";
import { generateCodeTasks } from "./generate-code-tasks.js";
import { reviewCodebase } from "./review-codebase.js";
import { createGithubIssues } from "./create-github-issues.js";
import { matchDeveloper } from "./match-developer.js";
import { deploymentChecklist } from "./deployment-checklist.js";
import { generateHandoffPack } from "./generate-handoff-pack.js";

// Order roughly follows the lifecycle: idea -> plan -> build -> review -> ship.
export const TOOLS: DevibeTool[] = [
  createProjectBrief,
  generatePrd,
  generateAppArchitecture,
  generatePagesAndScreens,
  generateCodeTasks,
  reviewCodebase,
  createGithubIssues,
  matchDeveloper,
  deploymentChecklist,
  generateHandoffPack,
] as DevibeTool[];

export { type DevibeTool, type ToolContext } from "./base.js";
