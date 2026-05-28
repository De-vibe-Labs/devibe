import { relations, sql } from "drizzle-orm";
import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// --- Enums -----------------------------------------------------------------

export const projectStatus = pgEnum("project_status", [
  "draft",
  "prototyping",
  "marketplace",
  "deployed",
  "archived",
]);

export const projectType = pgEnum("project_type", [
  "website",
  "saas",
  "ai_tool",
  "mobile_app",
  "blockchain",
  "e_commerce",
  "marketplace",
  "business_software",
  "custom",
]);

export const taskStatus = pgEnum("task_status", ["todo", "in_progress", "review", "completed"]);
export const taskPriority = pgEnum("task_priority", ["low", "medium", "high", "critical"]);

export const agentRole = pgEnum("agent_role", [
  "product",
  "design",
  "frontend",
  "backend",
  "mobile",
  "ai",
  "blockchain",
  "qa",
  "deployment",
  "handoff",
]);

export const developerType = pgEnum("developer_type", [
  "freelancer",
  "dev_house",
  "frontend",
  "backend",
  "mobile",
  "blockchain",
  "ai_engineer",
]);

export const jobStatus = pgEnum("job_status", ["open", "matched", "assigned", "escrow", "completed", "cancelled"]);
export const deploymentStatus = pgEnum("deployment_status", ["pending", "building", "live", "failed", "rolled_back"]);
export const deploymentProvider = pgEnum("deployment_provider", ["vercel", "railway", "fly", "other"]);

// --- Tables ----------------------------------------------------------------

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  name: text("name"),
  authProvider: text("auth_provider").notNull().default("api_key"),
  externalId: text("external_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  emailIdx: uniqueIndex("users_email_idx").on(t.email),
}));

export const projects = pgTable("projects", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").references(() => users.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  status: projectStatus("status").notNull().default("draft"),
  type: projectType("type").notNull().default("custom"),
  stack: text("stack").notNull().default(""),
  brief: jsonb("brief"),
  prd: jsonb("prd"),
  architecture: jsonb("architecture"),
  pages: jsonb("pages"),
  githubRepo: text("github_repo"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const agents = pgTable("agents", {
  id: text("id").primaryKey(),
  projectId: text("project_id").references(() => projects.id, { onDelete: "cascade" }),
  role: agentRole("role").notNull(),
  name: text("name").notNull(),
  status: text("status").notNull().default("idle"),
  logs: jsonb("logs").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const tasks = pgTable("tasks", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  status: taskStatus("status").notNull().default("todo"),
  priority: taskPriority("priority").notNull().default("medium"),
  stack: jsonb("stack").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  files: jsonb("files").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  acceptanceCriteria: jsonb("acceptance_criteria").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  assignedTo: text("assigned_to"),
  estimateHours: real("estimate_hours"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const developerProfiles = pgTable("developer_profiles", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  title: text("title").notNull().default(""),
  type: developerType("type").notNull().default("freelancer"),
  skills: jsonb("skills").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  hourlyRate: integer("hourly_rate").notNull().default(0),
  rating: real("rating").notNull().default(0),
  completedJobs: integer("completed_jobs").notNull().default(0),
  availability: text("availability").notNull().default("medium"),
  githubUrl: text("github_url"),
  verified: boolean("verified").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const marketplaceJobs = pgTable("marketplace_jobs", {
  id: text("id").primaryKey(),
  projectId: text("project_id").references(() => projects.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  status: jobStatus("status").notNull().default("open"),
  budget: integer("budget").notNull().default(0),
  requiredSkills: jsonb("required_skills").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  assignedDeveloperId: text("assigned_developer_id").references(() => developerProfiles.id, {
    onDelete: "set null",
  }),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const githubConnections = pgTable("github_connections", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
  projectId: text("project_id").references(() => projects.id, { onDelete: "cascade" }),
  repoFullName: text("repo_full_name").notNull(),
  installationId: text("installation_id"),
  accessTokenRef: text("access_token_ref"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const deployments = pgTable("deployments", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  provider: deploymentProvider("provider").notNull().default("vercel"),
  status: deploymentStatus("status").notNull().default("pending"),
  url: text("url"),
  checklist: jsonb("checklist"),
  logs: jsonb("logs").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const handoffPacks = pgTable("handoff_packs", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  jobId: text("job_id").references(() => marketplaceJobs.id, { onDelete: "set null" }),
  contents: jsonb("contents").notNull(),
  budget: integer("budget"),
  timelineWeeks: integer("timeline_weeks"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const auditLogs = pgTable("audit_logs", {
  id: text("id").primaryKey(),
  actorId: text("actor_id"),
  action: text("action").notNull(),
  resourceType: text("resource_type").notNull(),
  resourceId: text("resource_id"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// --- Relations -------------------------------------------------------------

export const projectsRelations = relations(projects, ({ many, one }) => ({
  owner: one(users, { fields: [projects.ownerId], references: [users.id] }),
  tasks: many(tasks),
  agents: many(agents),
  deployments: many(deployments),
  handoffPacks: many(handoffPacks),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  project: one(projects, { fields: [tasks.projectId], references: [projects.id] }),
}));

export const marketplaceJobsRelations = relations(marketplaceJobs, ({ one }) => ({
  project: one(projects, { fields: [marketplaceJobs.projectId], references: [projects.id] }),
  developer: one(developerProfiles, {
    fields: [marketplaceJobs.assignedDeveloperId],
    references: [developerProfiles.id],
  }),
}));

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
export type DeveloperProfile = typeof developerProfiles.$inferSelect;
export type MarketplaceJob = typeof marketplaceJobs.$inferSelect;
export type Deployment = typeof deployments.$inferSelect;
export type HandoffPack = typeof handoffPacks.$inferSelect;
