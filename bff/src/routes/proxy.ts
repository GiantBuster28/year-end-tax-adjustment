import { Router, Request, Response, NextFunction } from 'express';
import { createProxyMiddleware, Options } from 'http-proxy-middleware';
import { config } from '../config';

const router = Router();

const proxyOptions: Options = {
  target: config.api.url,
  changeOrigin: true,

  // Forward the request ID for end-to-end traceability
  on: {
    proxyReq: (proxyReq, req) => {
      const requestId = (req as Request).headers['x-request-id'];
      if (requestId) {
        proxyReq.setHeader('X-Request-Id', requestId);
      }
      // Forward real client IP
      const clientIp = (req as Request).ip ?? (req as Request).socket.remoteAddress ?? '';
      proxyReq.setHeader('X-Forwarded-For', clientIp);
    },

    error: (err, req, res) => {
      console.error(
        `[proxy] Backend unreachable req_id=${(req as Request).headers['x-request-id'] ?? '-'}:`,
        (err as Error).message,
      );
      // res is IncomingMessage | ServerResponse — narrow to ServerResponse
      if ('status' in res && typeof (res as Response).status === 'function') {
        (res as Response).status(503).json({
          error: 'Service Unavailable',
          message: 'Backend API is currently unavailable. Please try again later.',
          requestId: (req as Request).headers['x-request-id'],
        });
      }
    },
  },
};

/**
 * Proxy all remaining /api/v1/* requests to the backend API.
 * Authentication has already been validated by the auth middleware.
 */
router.use('/', createProxyMiddleware(proxyOptions));

// Explicit type annotation so Express route handler typing is satisfied
router.use((_req: Request, _res: Response, next: NextFunction) => next());

export default router;
