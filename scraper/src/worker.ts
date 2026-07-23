import { Worker, Queue, Job } from 'bullmq';
import Redis from 'ioredis';
import simpleGit from 'simple-git';
import { glob } from 'glob';
import fs from 'fs';
import path from 'path';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const connection = new Redis(redisUrl, { maxRetriesPerRequest: null });

const newRepoQueueName = 'new_repo_job';
const scrapedDataQueueName = 'scraped_data_job';

// Also write to redis list for python engine worker simplicity
const engineRedisList = 'devsec:scraped_jobs';

// Define the downstream queue
const scrapedDataQueue = new Queue(scrapedDataQueueName, { connection });

interface NewRepoJobData {
  reportId: string;
  repositoryUrl: string;
  branch: string;
}

const logToRedis = async (reportId: string, level: string, message: string) => {
  const logEntry = JSON.stringify({
    timestamp: new Date().toISOString(),
    component: 'SCRAPER',
    level,
    message
  });
  await connection.rpush(`report_logs:${reportId}`, logEntry);
  console.log(`[${level}] ${message}`);
};

const worker = new Worker(
  newRepoQueueName,
  async (job: Job) => {
    const { reportId, repositoryUrl, branch } = job.data as NewRepoJobData;
    await logToRedis(reportId, 'INFO', `Started scraping for report ${reportId}`);
    
    const cloneDir = `/tmp/scans/repos/${reportId}`;
    
    try {
      // 1. Create temp dir and clone
      fs.mkdirSync(cloneDir, { recursive: true });
      const git = simpleGit();
      await logToRedis(reportId, 'INFO', `Cloning ${repositoryUrl} branch ${branch}...`);
      await git.clone(repositoryUrl, cloneDir, ['--depth', '1', '--branch', branch]);
      
      // 2. Find relevant files
      await logToRedis(reportId, 'INFO', `Searching for relevant files...`);
      const allFiles = await glob('**/*', {
        cwd: cloneDir,
        ignore: [
          '**/node_modules/**',
          '**/.git/**',
          '**/dist/**',
          '**/build/**',
          '**/__pycache__/**',
          '**/.next/**',
          '**/vendor/**',
          '**/.venv/**',
          '**/*.jpg', '**/*.png', '**/*.pdf', '**/*.ico'
        ],
        nodir: true,
      });

      const allowedExtensions = new Set([
        '.js', '.ts', '.jsx', '.tsx', '.py', '.json', '.yml', '.yaml', 
        '.env', '.env.example', '.env.local', '.tf', '.dockerfile', '.toml', '.cfg', '.ini', '.conf'
      ]);

      const priorityKeywords = ['auth', 'login', 'config', 'route', 'api', 'server', 'db', 'database', 'controller', 'middleware', 'secret', 'password', 'token', 'key', 'env', 'package', 'requirements'];

      let relevantFiles = allFiles.filter(file => {
        const ext = path.extname(file).toLowerCase();
        const basename = path.basename(file).toLowerCase();
        return allowedExtensions.has(ext) || basename === 'dockerfile';
      });

      // Sort by priority keywords
      relevantFiles.sort((a, b) => {
        const aLower = a.toLowerCase();
        const bLower = b.toLowerCase();
        const aHas = priorityKeywords.some(kw => aLower.includes(kw));
        const bHas = priorityKeywords.some(kw => bLower.includes(kw));
        if (aHas && !bHas) return -1;
        if (!aHas && bHas) return 1;
        return 0;
      });

      // 3. Read file contents
      const filesData = [];
      let skippedFiles = 0;
      for (const file of relevantFiles) {
        const fullPath = path.join(cloneDir, file);
        const stats = fs.statSync(fullPath);
        
        // Skip files > 100KB
        if (stats.size > 100 * 1024) {
          skippedFiles++;
          continue;
        }
        
        const content = fs.readFileSync(fullPath, 'utf-8');
        filesData.push({
          path: file,
          content
        });
      }

      await logToRedis(reportId, 'INFO', `Scraped ${filesData.length} files (skipped ${skippedFiles} large files). Enqueuing for analysis...`);
      
      const downstreamData = { reportId, files: filesData };
      
      // Enqueue to BullMQ
      await scrapedDataQueue.add('scraped_data', downstreamData);
      
      // Also push to Redis list for simpler Python consumption
      await connection.lpush(engineRedisList, JSON.stringify(downstreamData));
      
      await logToRedis(reportId, 'INFO', `Enqueued successfully to engine.`);
      
    } catch (error: any) {
      await logToRedis(reportId, 'ERROR', `Error during scraping: ${error.message}`);
      throw error; // Will be marked as failed by BullMQ
    } finally {
      // Cleanup
      await logToRedis(reportId, 'INFO', `Cleaning up ${cloneDir}...`);
      fs.rmSync(cloneDir, { recursive: true, force: true });
    }
  },
  { connection }
);

worker.on('completed', job => {
  console.log(`[Worker] Job ${job.id} completed successfully`);
});

worker.on('failed', (job, err) => {
  console.log(`[Worker] Job ${job?.id} failed:`, err);
});

console.log('Scraper worker started, listening on new_repo_job queue...');
