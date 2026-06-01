import { Queue } from "bullmq";
import { getRedis, isQueueConfigured } from "./connection.js";
import { ConfigError } from "../utils/errors.js";

export const PIPELINE_QUEUE = "devibe:pipeline";

export interface PipelineJobData {
  projectId?: string;
  idea: string;
  actorId: string;
  steps?: string[];
}

let pipelineQueue: Queue<PipelineJobData> | null = null;

export function getPipelineQueue(): Queue<PipelineJobData> {
  if (!isQueueConfigured()) {
    throw new ConfigError("REDIS_URL is not configured — cannot enqueue background jobs.");
  }
  if (!pipelineQueue) {
    pipelineQueue = new Queue<PipelineJobData>(PIPELINE_QUEUE, {
      // BullMQ bundles its own ioredis copy; the instance is structurally
      // identical so we hand it across the (duplicate) type boundary.
      connection: getRedis() as never,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 2000 },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    });
  }
  return pipelineQueue!;
}

export async function enqueuePipeline(data: PipelineJobData): Promise<string> {
  const queue = getPipelineQueue();
  const job = await queue.add("run-pipeline", data);
  return job.id!;
}

export { isQueueConfigured } from "./connection.js";
