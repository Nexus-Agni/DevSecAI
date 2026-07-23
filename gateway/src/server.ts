import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth';
import projectRoutes from './routes/projects';
import reportRoutes from './routes/reports';

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
