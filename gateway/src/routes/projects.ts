import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import prisma from '../database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { newRepoQueue } from '../queue';

const router = Router();
router.use(authenticate);

router.post(
  '/',
  [
    body('repositoryUrl').isURL().withMessage('Valid repository URL is required'),
    body('branch').optional().isString()
  ],
  async (req: AuthRequest, res: any) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { repositoryUrl, branch = 'main' } = req.body;
    const userId = req.user!.userId;

    try {
      const project = await prisma.project.create({
        data: {
          repositoryUrl,
          branch,
          userId,
          reports: {
            create: {
              status: 'PENDING'
            }
          }
        },
        include: {
          reports: true
        }
      });

      const report = project.reports[0];

      await newRepoQueue.add('new_repo', {
        reportId: report.id,
        repositoryUrl,
        branch
      });

      res.status(201).json(project);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

router.get('/', async (req: AuthRequest, res: any) => {
  const userId = req.user!.userId;
  try {
    const projects = await prisma.project.findMany({
      where: { userId },
      include: {
        reports: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(projects);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req: AuthRequest, res: any) => {
  const { id } = req.params;
  const userId = req.user!.userId;
  try {
    const project = await prisma.project.findFirst({
      where: { id, userId },
      include: {
        reports: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json(project);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
