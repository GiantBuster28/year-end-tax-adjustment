import { Request, Response } from 'express';
import { getRedisClient } from '../redisClient';

const API_WINDOW_MS = 60 * 1000;   // 1 minute
const API_MAX = 100;

function ipKey(req: Request): string {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ??
    req.socket.remoteAddress ??
    'unknown'
  );
}

async function checkRateLimit(
  key: string,
  max: number,
  windowMs: number,
  res: Response,
  label: string,
): Promise<boolean> {
  try {
    const redis = getRedisClient();
    const current = await redis.incr(key);
    if (current === 1) {
      await redis.pexpire(key, windowMs);
    }
    const ttl = await redis.pttl(key);
    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - current));
    res.setHeader('X-RateLimit-Reset', Math.ceil((Date.now() + ttl) / 1000));

    if (current > max) {
      res.status(429).json({
        error: 'TooManyRequests',
        message: label,
        retryAfter: Math.ceil(ttl / 1000),
      });
      return false;
    }
  } catch {
    // Redis unavailable: fail-open for rate limiting only (degraded mode)
  }
  return true;
}

/** General limiter for all API routes: 100 requests per IP per minute */
export async function apiRateLimit(
  req: Request,
  res: Response,
  next: () => void,
): Promise<void> {
  const key = `rl:api:${ipKey(req)}`;
  const allowed = await checkRateLimit(
    key,
    API_MAX,
    API_WINDOW_MS,
    res,
    'リクエスト数の上限に達しました。しばらくしてから再試行してください。',
  );
  if (allowed) next();
}
