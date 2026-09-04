import { Queue, Worker, Job, QueueOptions, WorkerOptions } from "bullmq";
import { redis, getRedisClient } from "./cache";

const QUEUE_PREFIX = "asm:";
const DEFAULT_CONCURRENCY = 5;

export interface QueueConfig {
  name: string;
  concurrency?: number;
  limiter?: {
    max: number;
    duration: number;
  };
}

export interface JobData {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  userId: string;
  platform?: string;
  scheduledAt?: string;
  priority?: number;
  attempts?: number;
  backoff?: {
    type: "exponential" | "fixed";
    delay: number;
  };
}

export interface JobResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

const queues = new Map<string, Queue>();
const workers = new Map<string, Worker>();

function getQueueConnection(): QueueOptions["connection"] {
  const client = getRedisClient();
  return {
    client: client as unknown as QueueOptions["connection"]["client"],
    prefix: QUEUE_PREFIX,
  };
}

function getWorkerConnection(): WorkerOptions["connection"] {
  const client = getRedisClient();
  return {
    client: client as unknown as WorkerOptions["connection"]["client"],
    prefix: QUEUE_PREFIX,
  };
}

export function createQueue(config: QueueConfig): Queue {
  if (queues.has(config.name)) {
    return queues.get(config.name)!;
  }

  const queue = new Queue(config.name, {
    connection: getQueueConnection(),
    defaultJobOptions: {
      removeOnComplete: {
        age: 7 * 24 * 60 * 60,
        count: 1000,
      },
      removeOnFail: {
        age: 30 * 24 * 60 * 60,
        count: 5000,
      },
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 1000,
      },
    },
  });

  if (config.limiter) {
    queue.set限速器 = undefined;
  }

  queues.set(config.name, queue);
  return queue;
}

export function createWorker(
  queueName: string,
  processor: (job: Job<JobData>) => Promise<JobResult>,
  concurrency: number = DEFAULT_CONCURRENCY
): Worker {
  if (workers.has(queueName)) {
    return workers.get(queueName)!;
  }

  const worker = new Worker<JobData>(
    queueName,
    async (job) => {
      try {
        const result = await processor(job);
        return result;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        console.error(`Job ${job.id} failed:`, errorMessage);
        throw error;
      }
    },
    {
      connection: getWorkerConnection(),
      concurrency,
      limiter: {
        max: 100,
        duration: 60000,
      },
    }
  );

  worker.on("completed", (job) => {
    console.log(`Job ${job.id} completed in queue ${queueName}`);
  });

  worker.on("failed", (job, error) => {
    console.error(`Job ${job?.id} failed in queue ${queueName}:`, error.message);
  });

  worker.on("stalled", (jobId) => {
    console.warn(`Job ${jobId} stalled in queue ${queueName}`);
  });

  workers.set(queueName, worker);
  return worker;
}

export async function addJob(
  queueName: string,
  data: JobData,
  options?: {
    delay?: number;
    priority?: number;
    attempts?: number;
  }
): Promise<Job<JobData>> {
  const queue = queues.get(queueName) || createQueue({ name: queueName });
  
  return queue.add(data.type, data, {
    delay: options?.delay,
    priority: options?.priority || data.priority,
    attempts: options?.attempts || data.attempts,
  });
}

export async function addScheduledJob(
  queueName: string,
  data: JobData,
  scheduledAt: Date
): Promise<Job<JobData>> {
  const delay = scheduledAt.getTime() - Date.now();
  
  if (delay < 0) {
    throw new Error("Scheduled time must be in the future");
  }
  
  return addJob(queueName, data, { delay });
}

export async function removeJob(queueName: string, jobId: string): Promise<boolean> {
  const queue = queues.get(queueName);
  if (!queue) return false;
  
  const job = await queue.getJob(jobId);
  if (!job) return false;
  
  await job.remove();
  return true;
}

export async function getJob(
  queueName: string,
  jobId: string
): Promise<Job<JobData> | null> {
  const queue = queues.get(queueName);
  if (!queue) return null;
  
  return queue.getJob(jobId) as Promise<Job<JobData> | null>;
}

export async function getJobState(
  queueName: string,
  jobId: string
): Promise<string | null> {
  const job = await getJob(queueName, jobId);
  return job?.state || null;
}

export async function getQueueStats(queueName: string): Promise<{
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}> {
  const queue = queues.get(queueName);
  if (!queue) {
    return { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 };
  }

  const [waiting, active, completed, failed, delayed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
  ]);

  return { waiting, active, completed, failed, delayed };
}

export async function pauseQueue(queueName: string): Promise<void> {
  const queue = queues.get(queueName);
  if (queue) {
    await queue.pause();
  }
}

export async function resumeQueue(queueName: string): Promise<void> {
  const queue = queues.get(queueName);
  if (queue) {
    await queue.resume();
  }
}

export async function cleanQueue(
  queueName: string,
  grace: number = 5000,
  limit: number = 100
): Promise<void> {
  const queue = queues.get(queueName);
  if (queue) {
    await queue.clean(grace, limit, "completed");
    await queue.clean(grace, limit, "failed");
  }
}

export async function closeAllQueues(): Promise<void> {
  for (const [name, worker] of workers) {
    await worker.close();
    workers.delete(name);
  }
  
  for (const [name, queue] of queues) {
    await queue.close();
    queues.delete(name);
  }
}

export const POST_QUEUE = "posts";
export const ANALYTICS_QUEUE = "analytics";
export const NOTIFICATION_QUEUE = "notifications";
export const MEDIA_QUEUE = "media";
export const SYNC_QUEUE = "sync";

export const postQueue = createQueue({ name: POST_QUEUE });
export const analyticsQueue = createQueue({ name: ANALYTICS_QUEUE });
export const notificationQueue = createQueue({ name: NOTIFICATION_QUEUE });
export const mediaQueue = createQueue({ name: MEDIA_QUEUE });
export const syncQueue = createQueue({ name: SYNC_QUEUE });
