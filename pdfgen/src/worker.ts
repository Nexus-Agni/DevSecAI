import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { PrismaClient } from '@prisma/client';
import puppeteer from 'puppeteer';
import ejs from 'ejs';
import path from 'path';
import fs from 'fs';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const connection = new Redis(redisUrl, { maxRetriesPerRequest: null });
const prisma = new PrismaClient();

const queueName = 'generate_pdf_job';

const logToRedis = async (reportId: string, level: string, message: string) => {
  const logEntry = JSON.stringify({
    timestamp: new Date().toISOString(),
    component: 'PDFGEN',
    level,
    message
  });
  await connection.rpush(`report_logs:${reportId}`, logEntry);
  console.log(`[${level}] ${message}`);
};

const worker = new Worker(
  queueName,
  async (job: Job) => {
    const { reportId } = job.data;
    await logToRedis(reportId, 'INFO', `Started PDF generation for report ${reportId}`);

    try {
      await prisma.analysisReport.update({
        where: { id: reportId },
        data: { status: 'GENERATING_REPORT' }
      });

      const report = await prisma.analysisReport.findUnique({
        where: { id: reportId },
        include: { project: true }
      });

      if (!report) throw new Error('Report not found');

      await logToRedis(reportId, 'INFO', `Rendering HTML template with report data...`);
      const templatePath = path.join(__dirname, '../templates/report.ejs');
      const html = await ejs.renderFile(templatePath, { report });

      await logToRedis(reportId, 'INFO', `Launching headless browser...`);
      const browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
      });
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });

      const reportsDir = path.join(__dirname, '../../reports');
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }

      const pdfPath = path.join(reportsDir, `${reportId}.pdf`);
      await logToRedis(reportId, 'INFO', `Printing to PDF: ${pdfPath}...`);
      await page.pdf({
        path: pdfPath,
        format: 'A4',
        printBackground: true,
        margin: { top: '1cm', right: '1cm', bottom: '1cm', left: '1cm' }
      });

      await browser.close();

      await prisma.analysisReport.update({
        where: { id: reportId },
        data: { 
          status: 'COMPLETED',
          pdfPath: `/app/reports/${reportId}.pdf`
        }
      });

      await logToRedis(reportId, 'INFO', `PDF generated and status marked as COMPLETED.`);

    } catch (error: any) {
      await logToRedis(reportId, 'ERROR', `Error generating PDF: ${error.message}`);
      await prisma.analysisReport.update({
        where: { id: reportId },
        data: { 
          status: 'FAILED',
          errorMessage: 'PDF generation failed'
        }
      });
      throw error;
    }
  },
  { connection }
);

console.log('PDFGen worker started, listening on generate_pdf_job queue...');
