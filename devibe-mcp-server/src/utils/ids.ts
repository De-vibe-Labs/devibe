import { randomUUID } from "node:crypto";

/** Prefixed, sortable-ish id. e.g. proj_a1b2c3... */
export function id(prefix: string): string {
  return `${prefix}_${randomUUID().replace(/-/g, "").slice(0, 24)}`;
}

export const newProjectId = () => id("proj");
export const newTaskId = () => id("task");
export const newJobId = () => id("job");
export const newHandoffId = () => id("handoff");
export const newDeploymentId = () => id("dep");
export const newAuditId = () => id("audit");
