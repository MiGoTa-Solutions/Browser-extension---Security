import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import authRoutes from './routes/auth';
import webAccessLockRoutes from './routes/webAccessLock';

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/locks', webAccessLockRoutes);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error & { statusCode?: number }, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  const status = err.statusCode && err.statusCode >= 400 ? err.statusCode : 500;
  res.status(status).json({ error: err.message || 'Internal server error' });
});

export default app;
