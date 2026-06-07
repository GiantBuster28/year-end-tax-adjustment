import 'dotenv/config';

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optional(name: string, defaultValue: string): string {
  return process.env[name] ?? defaultValue;
}

export const config = {
  port: parseInt(optional('PORT', '4000'), 10),

  api: {
    url: optional('API_URL', 'http://api:8000'),
  },

  redis: {
    url: optional('REDIS_URL', 'redis://redis:6379'),
  },

  jwt: {
    secret: process.env.NODE_ENV === 'production'
      ? required('JWT_SECRET')
      : optional('JWT_SECRET', 'dev-secret-key-change-in-production'),
  },

  cors: {
    origin: optional('CORS_ORIGIN', 'http://localhost:3000'),
  },

  nodeEnv: optional('NODE_ENV', 'development'),
} as const;
