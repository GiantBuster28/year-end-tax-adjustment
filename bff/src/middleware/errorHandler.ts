import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  status?: number;
  code?: string;
}

/**
 * Centralized error handler.
 * Must be registered last (after all routes) with four parameters.
 */
export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  const status = err.status ?? 500;
  const requestId = req.headers['x-request-id'] as string | undefined;

  // Log unexpected server errors
  if (status >= 500) {
    console.error(
      `[error] ${status} ${req.method} ${req.originalUrl} req_id=${requestId ?? '-'}`,
      err,
    );
  }

  res.status(status).json({
    error: httpStatusText(status),
    message: status < 500 ? err.message : 'An unexpected error occurred',
    ...(err.code ? { code: err.code } : {}),
    requestId,
  });
}

function httpStatusText(status: number): string {
  const map: Record<number, string> = {
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    409: 'Conflict',
    422: 'Unprocessable Entity',
    429: 'Too Many Requests',
    500: 'Internal Server Error',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
    504: 'Gateway Timeout',
  };
  return map[status] ?? 'Error';
}
