import { Worker, type Job } from "bullmq";
import { getRedis } from "./connection.js";
import { PIPELINE_QUEUE, type PipelineJobData } from "./index.js";
import { createProjectBrief } from "../mcp/tools/create-project-brief.js";
import { generatePrd } from "../mcp/tools/generate-prd.js";
import { generateAppArchitecture } from "../mcp/tools/generate-app-architecture.js";
import { generateCodeTasks } from "../mcp/tools/generate-code-tasks.js";
import { logger } from "../utils/logger.js";

/**
 * Background worker that runs the planning pipeline end-to-end:
 * idea -> brief -> PRD -> architecture -> code tasks. Each step persists when a
 * database is configured, so a single job hydrates a full project.
 */
async function runPipeline(job: Job<PipelineJobData>) {
  const { idea, actorId } = job.data;
  const ctx = { actorId };

  await job.updateProgress(10);
  const brief = (await createProjectBrief.handler({ idea, persist: true } as never, ctx)) as {
    projectId?: string;
  };
  const projectId = job.data.projectId ?? brief.projectId;

  await job.updateProgress(40);
  await generatePrd.handler({ projectId, idea } as never, ctx);

  await job.updateProgress(65);
  await generateAppArchitecture.handler({ projectId } as never, ctx);

  await job.updateProgress(90);
  const tasks = await generateCodeTasks.handler({ projectId, persist: true } as never, ctx);

  await job.updateProgress(100);
  return { projectId, tasks };
}

export function startWorker(): Worker<PipelineJobData> {
  const worker = new Worker<PipelineJobData>(PIPELINE_QUEUE, runPipeline, {
    connection: getRedis() as never,
    concurrency: 5,
  });

  worker.on("completed", (job) => logger.info({ jobId: job.id }, "pipeline job completed"));
  worker.on("failed", (job, err) => logger.error({ jobId: job?.id, err }, "pipeline job failed"));
  return worker;
}

// Allow running the worker as a standalone process: `npm run worker`.
if (import.meta.url === `file://${process.argv[1]}`) {
  logger.info("starting devibe pipeline worker");
  startWorker();
}
