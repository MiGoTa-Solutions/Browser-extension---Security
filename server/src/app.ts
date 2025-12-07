import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import authRoutes from './routes/auth';
import profileRoutes from './routes/profile';
import webAccessLockRoutes from './routes/webAccessLock';
import geminiRoutes from './routes/gemini';
import siteDetectorRoutes from './routes/siteDetector';

const app = express();

app.use(helmet());

// --- FIX STARTS HERE ---
app.use(
  cors({
    // allow any origin (including chrome-extension://...)
    origin: true, 
    // allow cookies/headers to be sent
    credentials: true, 
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
// --- FIX ENDS HERE ---

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/locks', webAccessLockRoutes);
app.use('/api/gemini', geminiRoutes);
app.use('/api/site-detector', siteDetectorRoutes);

// Error handler
app.use((err: Error & { statusCode?: number }, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  const status = err.statusCode && err.statusCode >= 400 ? err.statusCode : 500;
  res.status(status).json({ error: err.message || 'Internal server error' });
});

export default app;