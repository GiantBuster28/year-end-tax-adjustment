import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { getRedisClient } from '../redisClient';

/**
 * Paths that do not require a valid JWT.
 */
const PUBLIC_PATHS: RegExp[] = [
  /^\/health$/,
  /^\/api\/v1\/auth\/login$/,
];

function isPublic(path: string): boolean {
  return PUBLIC_PATHS.some((pattern) => pattern.test(path));
}

/**
 * JWT authentication middleware.
 *
 * 1. Skip public paths.
 * 2. Extract Bearer token from Authorization header.
 * 3. Verify signature with JWT_SECRET.
 * 4. Check Redis token blacklist (for logged-out tokens).
 * 5. Attach decoded payload to req for downstream use.
 */
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  if (isPublic(req.path)) {
    next();
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing or malformed Authorization header',
      requestId: req.headers['x-request-id'],
    });
    return;
  }

  const token = authHeader.slice('Bearer '.length);

  let payload: jwt.JwtPayload;
  try {
    payload = jwt.verify(token, config.jwt.secret) as jwt.JwtPayload;
  } catch (err) {
    const message = err instanceof jwt.TokenExpiredError
      ? 'Token has expired'
      : 'Invalid token';
    res.status(401).json({
      error: 'Unauthorized',
      message,
      requestId: req.headers['x-request-id'],
    });
    return;
  }

  // Check Redis blacklist (tokens invalidated on logout)
  try {
    const redis = getRedisClient();
    const blacklisted = await redis.get(`blacklist:${token}`);
    if (blacklisted) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Token has been revoked',
        requestId: req.headers['x-request-id'],
      });
      return;
    }
  } catch (redisErr) {
    // Redis unavailability should not block authentication in non-strict mode.
    // Log the error but continue (fail-open). Switch to fail-closed if required.
    console.error(
      `[auth] Redis check failed (req_id=${req.headers['x-request-id']}):`,
      redisErr,
    );
  }

  // Attach decoded payload so route handlers can read user info
  (req as Request & { user: jwt.JwtPayload }).user = payload;
  next();
}
