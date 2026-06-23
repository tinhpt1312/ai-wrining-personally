import { config } from 'dotenv';
import { DEFAULT_AI_MODEL, DEFAULT_FALLBACK_MODELS } from 'src/constants/ai.model';

config();

function parseModelList(value: string | undefined, defaults: string[]): string[] {
  const models = (value ?? defaults.join(','))
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  return [...new Set(models)];
}

function normalizeOrigin(url: string): string {
  return url.trim().replace(/\/$/, '');
}

export const ENV = {
  APP_PORT: process.env.APP_PORT ?? 8000,
  FRONTEND_URL: normalizeOrigin(
    process.env.FRONTEND_URL || 'http://localhost:3000',
  ),

  DATABASE: {
    HOST: process.env.DB_HOST,
    PORT: Number(process.env.DB_PORT),
    USERNAME: process.env.DB_USERNAME,
    PASSWORD: process.env.DB_PASSWORD,
    DATABASE: process.env.DB_DATABASE,
  },

  COOKIE: {
    ACCESS_TOKEN_TIME: process.env.COOKIE_ACCESS_TOKEN_EXPIRATION_TIME,
    ACCESS_TOKEN_NAME: process.env.COOKIE_ACCESS_TOKEN_NAME,
  },

  JWT: {
    SECRET: process.env.JWT_SECRET,
    EXPIRES: process.env.JWT_EXPIRATION_TIME,
    COOKIE_NAME: process.env.JWT_COOKIE_NAME,
  },

  GEMINI: {
    API_KEY: process.env.GEMINI_API_KEY,
    MODEL: process.env.GEMINI_MODEL || DEFAULT_AI_MODEL,
    FALLBACK_MODELS: parseModelList(
      process.env.GEMINI_FALLBACK_MODELS,
      DEFAULT_FALLBACK_MODELS,
    ),
    TEMPERATURE: Number(process.env.GEMINI_TEMPERATURE ?? 0.4),
    MAX_OUTPUT_TOKENS: Number(process.env.GEMINI_MAX_OUTPUT_TOKENS ?? 4096),
    DAILY_TOKEN_LIMIT: Number(process.env.DAILY_TOKEN_LIMIT ?? 50000),
    TOKEN_BUFFER_PERCENT: Number(process.env.TOKEN_BUFFER_PERCENT ?? 0.1),
  },
};
