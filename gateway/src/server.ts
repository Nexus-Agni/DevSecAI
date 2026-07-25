import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth';
import projectRoutes from './routes/projects';
import reportRoutes from './routes/reports';
import { QueueEvents, Job } from 'bullmq';
import { newRepoQueue, connection } from './queue';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const queueEvents = new QueueEvents('new_repo_job', { connection });

queueEvents.on('failed', async ({ jobId, failedReason }) => {
  try {
    if (!jobId) return;
    const job = await Job.fromId(newRepoQueue, jobId);
    if (job && job.data && job.data.reportId) {
      const reportId = job.data.reportId;
      await prisma.analysisReport.update({
        where: { id: reportId },
        data: { status: 'FAILED' }
      });
      await connection.rpush(`report_logs:${reportId}`, JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'ERROR',
        message: `Scraper failed: ${failedReason}`
      }));
    }
  } catch (error) {
    console.error('Error handling failed job event:', error);
  }
});

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3001'
}));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/reports', reportRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'UP', service: 'devsec-gateway' });
});

app.listen(PORT, () => {
  console.log(`Gateway service listening on port ${PORT}`);
});
