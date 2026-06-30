import { ENV } from 'src/config/env.config';

export { DEFAULT_AI_MODEL } from './ai.model';
export { ERROR_CODE, type ErrorCode } from './error-codes.constants';
export { ERROR_MESSAGES } from './error-messages.constants';
export { VALIDATION_MESSAGES } from './validation-messages.constants';
export { SUCCESS_MESSAGES } from './success-messages.constants';

export const CORS_OPTIONS = {
  origin: ENV.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
