import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { config } from './config';
import { requestId, httpLogger } from './middleware/logger';
import { authenticate } from './middleware/auth';
import { apiRateLimit } from './middleware/rateLimit';
import { errorHandler } from './middleware/errorHandler';
import apiRouter from './routes/index';
import { closeRedisClient } from './redisClient';

const app = express();

// ── Security & utility middleware ─────────────────────────────────────────────
app.use(helmet());

app.use(
  cors({
    origin: config.cors.origin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
    exposedHeaders: ['X-Request-Id'],
  }),
);

// Attach / propagate request ID before any other middleware
app.use(requestId);

// HTTP access logging
app.use(httpLogger);

// Body parsers (only for non-proxied routes; proxy streams raw body)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', service: 'bff', timestamp: new Date().toISOString() });
});

// ── Rate limiting ─────────────────────────────────────────────────────────────
app.use('/api/v1', apiRateLimit);

// ── JWT authentication (applied to all /api/v1/* routes) ─────────────────────
app.use('/api/v1', authenticate);

// ── API routes ────────────────────────────────────────────────────────────────
app.use('/api/v1', apiRouter);

// ── Global error handler ──────────────────────────────────────────────────────
app.use(errorHandler);

// ── Start server ──────────────────────────────────────────────────────────────
const server = app.listen(config.port, () => {
  console.info(
    `[bff] Listening on port ${config.port} (env=${config.nodeEnv}, target=${config.api.url})`,
  );
});

// ── Graceful shutdown ─────────────────────────────────────────────────────────
async function shutdown(signal: string): Promise<void> {
  console.info(`[bff] Received ${signal}, shutting down gracefully...`);
  server.close(async () => {
    await closeRedisClient();
    console.info('[bff] Server closed.');
    process.exit(0);
  });

  // Force exit after 10 s if connections linger
  setTimeout(() => {
    console.error('[bff] Forced exit after timeout.');
    process.exit(1);
  }, 10_000);
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

export default app;
