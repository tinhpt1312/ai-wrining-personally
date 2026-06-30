import { AiErrorDetails } from '../types/ai.type';

export enum AiErrorCode {
  INVALID_RESPONSE = 'INVALID_RESPONSE',
  RATE_LIMITED = 'RATE_LIMITED',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  API_ERROR = 'API_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
}

export class AiError extends Error {
  constructor(
    public code: string,
    message: string,
    public retryable: boolean = false,
    public retryAfter?: number,
    public statusCode?: number,
  ) {
    super(message);
    this.name = 'AiError';
  }
}

interface ErrorLike {
  message?: string;
  code?: string;
}

function isErrorLike(error: unknown): error is ErrorLike {
  return typeof error === 'object' && error !== null;
}

function getErrorMessage(error: unknown): string | undefined {
  if (error instanceof Error) {
    return error.message;
  }
  if (isErrorLike(error) && typeof error.message === 'string') {
    return error.message;
  }
  return undefined;
}

function getErrorCode(error: unknown): string | undefined {
  if (isErrorLike(error) && typeof error.code === 'string') {
    return error.code;
  }
  return undefined;
}

export class AiErrorHandler {
  static handle(error: unknown): AiErrorDetails {
    const message = getErrorMessage(error);
    const code = getErrorCode(error);

    if (message) {
      if (
        message.includes('RESOURCE_EXHAUSTED') ||
        message.includes('429') ||
        message.includes('quota')
      ) {
        return {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Gemini API rate limit exceeded. Please try again later.',
          retryable: true,
          retryAfter: 60,
          statusCode: 429,
        };
      }

      if (
        message.includes('UNAUTHENTICATED') ||
        message.includes('401') ||
        message.includes('API key')
      ) {
        return {
          code: 'AUTH_ERROR',
          message: 'Invalid Gemini API key or authentication failed.',
          retryable: false,
          statusCode: 401,
        };
      }

      if (message.includes('PERMISSION_DENIED')) {
        return {
          code: 'PERMISSION_ERROR',
          message: 'Permission denied. Check API key and project permissions.',
          retryable: false,
          statusCode: 403,
        };
      }

      if (
        message.includes('INTERNAL') ||
        message.includes('500') ||
        message.includes('503')
      ) {
        return {
          code: 'SERVICE_UNAVAILABLE',
          message: 'Gemini API service is temporarily unavailable.',
          retryable: true,
          retryAfter: 30,
          statusCode: 503,
        };
      }

      if (message.includes('INVALID_ARGUMENT') || message.includes('400')) {
        return {
          code: 'INVALID_REQUEST',
          message: 'Invalid request. Check prompt and parameters.',
          retryable: false,
          statusCode: 400,
        };
      }

      if (message.includes('BLOCKED') || message.includes('policy')) {
        return {
          code: 'CONTENT_BLOCKED',
          message:
            'Request blocked by safety policies. Try with different content.',
          retryable: false,
          statusCode: 400,
        };
      }
    }

    if (
      code === 'ECONNREFUSED' ||
      code === 'ENOTFOUND' ||
      message?.includes('ECONNREFUSED')
    ) {
      return {
        code: 'NETWORK_ERROR',
        message: 'Failed to connect to Gemini API. Please try again.',
        retryable: true,
        retryAfter: 10,
        statusCode: 503,
      };
    }

    if (code === 'ETIMEDOUT' || message?.includes('timeout')) {
      return {
        code: 'TIMEOUT_ERROR',
        message: 'Request to Gemini API timed out. Please try again.',
        retryable: true,
        retryAfter: 15,
        statusCode: 504,
      };
    }

    return {
      code: 'UNKNOWN_ERROR',
      message: message || 'An unexpected error occurred.',
      retryable: false,
      statusCode: 500,
    };
  }

  static isRetryable(error: AiErrorDetails): boolean {
    return error.retryable;
  }

  static getRetryAfter(error: AiErrorDetails): number {
    return error.retryAfter || 60;
  }
}
