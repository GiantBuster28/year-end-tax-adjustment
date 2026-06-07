import { Router } from 'express';
import authRouter from './auth';
import proxyRouter from './proxy';

const router = Router();

// Auth routes (login / logout) — no JWT required
router.use('/auth', authRouter);

// All other API routes are proxied to the backend
// (JWT validation has already run as application-level middleware)
router.use('/', proxyRouter);

export default router;
