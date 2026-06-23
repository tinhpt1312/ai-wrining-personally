import { ENV } from 'src/config/env.config';

export { DEFAULT_AI_MODEL } from './ai.model';

export const CORS_OPTIONS = {
  origin: ENV.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
