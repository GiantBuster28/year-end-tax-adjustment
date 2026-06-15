import { Router, Request, Response, NextFunction } from 'express';
import http from 'http';
import https from 'https';
import { URL } from 'url';
import { config } from '../config';
import { getRedisClient } from '../redisClient';
import jwt from 'jsonwebtoken';
import { loginRateLimit } from '../middleware/rateLimit';

const router = Router();

/**
 * Forward a request to the backend API and return the raw response body + status.
 */
function forwardToApi(
  method: string,
  path: string,
  headers: Record<string, string>,
  body?: string,
): Promise<{ status: number; headers: Record<string, string>; body: string }> {
  return new Promise((resolve, reject) => {
    const target = new URL(path, config.api.url);
    const isHttps = target.protocol === 'https:';
    const transport = isHttps ? https : http;

    const options: http.RequestOptions = {
      hostname: target.hostname,
      port: target.port || (isHttps ? 443 : 80),
      path: target.pathname + target.search,
      method,
      headers,
    };

    const req = transport.request(options, (res) => {
      let data = '';
      res.on('data', (chunk: Buffer) => { data += chunk.toString(); });
      res.on('end', () => {
        resolve({
          status: res.statusCode ?? 500,
          headers: res.headers as Record<string, string>,
          body: data,
        });
      });
    });

    req.on('error', reject);

    if (body) req.write(body);
    req.end();
  });
}

/**
 * POST /api/v1/auth/login
 * Forward credentials to backend, set HttpOnly cookie with JWT on success.
 */
router.post('/login', loginRateLimit, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const bodyStr = JSON.stringify(req.body);
    const upstream = await forwardToApi(
      'POST',
      '/api/v1/auth/login',
      {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyStr).toString(),
        'X-Request-Id': (req.headers['x-request-id'] as string) ?? '',
        'X-Forwarded-For': req.ip ?? '',
      },
      bodyStr,
    );

    // Parse upstream response
    let data: Record<string, unknown>;
    try {
      data = JSON.parse(upstream.body) as Record<string, unknown>;
    } catch {
      res.status(upstream.status).send(upstream.body);
      return;
    }

    if (upstream.status !== 200) {
      res.status(upstream.status).json(data);
      return;
    }

    const token = data['access_token'] as string | undefined;
    if (token) {
      // Decode to get expiry for cookie maxAge
      const decoded = jwt.decode(token) as jwt.JwtPayload | null;
      const maxAge = decoded?.exp
        ? (decoded.exp - Math.floor(Date.now() / 1000)) * 1000
        : 8 * 60 * 60 * 1000; // default 8 h

      res.cookie('access_token', token, {
        httpOnly: true,
        secure: config.nodeEnv === 'production',
        sameSite: 'lax',
        maxAge,
        path: '/',
      });
    }

    res.status(200).json(data);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/auth/logout
 * Add the current token to the Redis blacklist and clear the cookie.
 */
router.post('/logout', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Token may be in Authorization header or cookie
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.slice('Bearer '.length)
      : req.cookies?.access_token as string | undefined;

    if (token) {
      try {
        // jwt.verify で署名を検証してから失効処理（偽造トークンによるRedis汚染を防ぐ）
        const decoded = jwt.verify(token, config.jwt.secret) as jwt.JwtPayload;
        const ttl = decoded.exp
          ? decoded.exp - Math.floor(Date.now() / 1000)
          : 8 * 60 * 60;

        if (ttl > 0) {
          const redis = getRedisClient();
          // バックエンドの deps.py と同じキープレフィックス "revoked:" を使用
          await redis.setex(`revoked:${token}`, ttl, '1');
        }
      } catch (jwtErr) {
        // 無効トークンはそのまま無視してログアウト成功を返す（二重ログアウト等）
        console.warn('[auth/logout] Token verification skipped:', (jwtErr as Error).message);
      }
    }

    res.clearCookie('access_token', { path: '/' });
    res.status(200).json({ message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
});

export default router;
