import { Queue } from 'bullmq';
import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
export const connection = new Redis(redisUrl, { maxRetriesPerRequest: null });

export const newRepoQueue = new Queue('new_repo_job', { connection });
export const scrapedDataQueue = new Queue('scraped_data_job', { connection });
export const generatePdfQueue = new Queue('generate_pdf_job', { connection });
