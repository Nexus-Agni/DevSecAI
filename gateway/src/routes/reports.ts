import { Router } from 'express';
import prisma from '../database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { generatePdfQueue } from '../queue';
import path from 'path';
import fs from 'fs';
import { connection } from '../queue';

const router = Router();
router.use(authenticate);

// Middleware to verify report belongs to user
const verifyReportOwnership = async (req: AuthRequest, res: any, next: any) => {
  const { id } = req.params;
  const userId = req.user!.userId;
  try {
    const report = await prisma.analysisReport.findUnique({
      where: { id },
      include: { project: true }
    });
    if (!report) return res.status(404).json({ error: 'Report not found' });
    if (report.project.userId !== userId) return res.status(403).json({ error: 'Forbidden' });
    (req as any).report = report;
    next();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

router.get('/:id', verifyReportOwnership, async (req: AuthRequest, res: any) => {
  res.json((req as any).report);
});

router.get('/:id/status', verifyReportOwnership, async (req: AuthRequest, res: any) => {
  const report = (req as any).report;
  res.json({
    id: report.id,
    status: report.status,
    riskScore: report.riskScore
  });
});

router.get('/:id/logs', verifyReportOwnership, async (req: AuthRequest, res: any) => {
  const { id } = req.params;
  try {
    const logs = await connection.lrange(`report_logs:${id}`, 0, -1);
    const parsedLogs = logs.map(log => JSON.parse(log));
    res.json(parsedLogs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

router.post('/:id/pdf', verifyReportOwnership, async (req: AuthRequest, res: any) => {
  const { id } = req.params;
  try {
    await generatePdfQueue.add('generate_pdf', { reportId: id });
    res.json({ message: 'PDF generation enqueued' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to enqueue PDF generation' });
  }
});

router.get('/:id/download', verifyReportOwnership, async (req: AuthRequest, res: any) => {
  const report = (req as any).report;
  if (!report.pdfPath) return res.status(404).json({ error: 'PDF not generated yet' });
  
  // Assuming the pdfgen service saves PDFs in a shared volume mapped to /app/reports (or similar)
  // Need to make sure gateway also has access to this volume if it serves the file directly
  // In the docker-compose, gateway doesn't currently mount shared_reports.
  // I should update docker-compose later or just serve it if it's there.
  // Let's assume gateway will serve it from /app/reports.
  const pdfPath = path.resolve(report.pdfPath);
  if (fs.existsSync(pdfPath)) {
    res.download(pdfPath);
  } else {
    res.status(404).json({ error: 'PDF file not found on disk' });
  }
});

router.post('/:id/cancel', verifyReportOwnership, async (req: AuthRequest, res: any) => {
  console.log(`[CANCEL] Cancelling report ${req.params.id}`);
  const { id } = req.params;
  try {
    const report = await prisma.analysisReport.findUnique({ where: { id } });
    if (!report) return res.status(404).json({ error: 'Report not found' });
    
    if (['PENDING', 'CLONING', 'SCRAPING', 'ANALYZING', 'GENERATING_REPORT'].includes(report.status)) {
      await prisma.analysisReport.update({
        where: { id },
        data: { 
          status: 'FAILED',
          errorMessage: 'Analysis stopped by user'
        }
      });
      await connection.rpush(`report_logs:${id}`, JSON.stringify({
        timestamp: new Date().toISOString(),
        component: 'SYSTEM',
        level: 'WARN',
        message: 'Analysis stopped by user.'
      }));
      res.json({ message: 'Analysis cancelled successfully' });
    } else {
      res.status(400).json({ error: 'Report is already finished or failed' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to cancel analysis' });
  }
});

router.delete('/:id', verifyReportOwnership, async (req: AuthRequest, res: any) => {
  console.log(`[DELETE] Deleting report ${req.params.id}`);
  const { id } = req.params;
  try {
    const report = await prisma.analysisReport.findUnique({ where: { id } });
    if (!report) return res.status(404).json({ error: 'Report not found' });

    // 1. Delete from Qdrant
    const collectionName = `repo_${id.replace(/-/g, '_')}`;
    try {
      const qdrantHost = process.env.QDRANT_HOST || 'qdrant';
      const qdrantPort = process.env.QDRANT_PORT || '6333';
      await fetch(`http://${qdrantHost}:${qdrantPort}/collections/${collectionName}`, {
        method: 'DELETE'
      });
    } catch (e) {
      console.error('Error deleting Qdrant collection', e);
    }

    // 2. Delete logs from Redis
    await connection.del(`report_logs:${id}`);

    // 3. Delete PDF if exists
    if (report.pdfPath) {
      try {
        const pdfPath = path.resolve(report.pdfPath);
        if (fs.existsSync(pdfPath)) {
          fs.unlinkSync(pdfPath);
        }
      } catch (e) {
         console.error('Error deleting PDF', e);
      }
    }

    // 4. Delete from DB
    await prisma.analysisReport.delete({ where: { id } });

    res.json({ message: 'Report completely deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete report' });
  }
});

export default router;
