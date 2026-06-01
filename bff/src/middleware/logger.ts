import morgan from 'morgan';
import { v4 as uuidv4 } from 'uuid';
import { Request, Response, NextFunction } from 'express';

/**
 * Attach a unique request ID to each incoming request.
 * The ID is read from X-Request-Id (set by nginx) or generated fresh.
 * It is propagated to the response so callers can correlate logs.
 */
export function requestId(req: Request, res: Response, next: NextFunction): void {
  const id = (req.headers['x-request-id'] as string | undefined) ?? uuidv4();
  req.headers['x-request-id'] = id;
  res.setHeader('X-Request-Id', id);
  next();
}

// Include request ID in every Morgan log line
morgan.token('request-id', (req: Request) => req.headers['x-request-id'] as string);

/**
 * HTTP access logger using Morgan.
 * Format: :method :url :status :res[content-length] - :response-time ms [req_id=:request-id]
 */
export const httpLogger = morgan(
  ':method :url :status :res[content-length] - :response-time ms [req_id=:request-id]',
);
