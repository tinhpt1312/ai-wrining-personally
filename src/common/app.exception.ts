import { HttpException, HttpStatus } from '@nestjs/common';
import { ERROR_CODE, type ErrorCode } from 'src/constants/error-codes.constants';
import { ERROR_MESSAGES } from 'src/constants/error-messages.constants';

const DEFAULT_STATUS: Partial<Record<ErrorCode, HttpStatus>> = {
  [ERROR_CODE.INVALID_CREDENTIALS]: HttpStatus.UNAUTHORIZED,
  [ERROR_CODE.ACCOUNT_DEACTIVATED]: HttpStatus.UNAUTHORIZED,
  [ERROR_CODE.TOKEN_INVALID]: HttpStatus.UNAUTHORIZED,
  [ERROR_CODE.CURRENT_PASSWORD_WRONG]: HttpStatus.UNAUTHORIZED,
  [ERROR_CODE.ACCESS_DENIED]: HttpStatus.FORBIDDEN,
  [ERROR_CODE.FORBIDDEN_OPERATION]: HttpStatus.FORBIDDEN,
  [ERROR_CODE.WRITING_ACCESS_DENIED]: HttpStatus.FORBIDDEN,
  [ERROR_CODE.ANALYTICS_ACCESS_DENIED]: HttpStatus.FORBIDDEN,
  [ERROR_CODE.WRITING_NOT_PUBLIC]: HttpStatus.FORBIDDEN,
  [ERROR_CODE.EXPORT_ACCESS_DENIED]: HttpStatus.FORBIDDEN,
  [ERROR_CODE.USERNAME_EXISTS]: HttpStatus.CONFLICT,
  [ERROR_CODE.EMAIL_ALREADY_USED]: HttpStatus.CONFLICT,
  [ERROR_CODE.USER_NOT_FOUND]: HttpStatus.NOT_FOUND,
  [ERROR_CODE.WRITING_NOT_FOUND]: HttpStatus.NOT_FOUND,
  [ERROR_CODE.ANALYTICS_NOT_FOUND]: HttpStatus.NOT_FOUND,
  [ERROR_CODE.REVISION_NOT_FOUND]: HttpStatus.NOT_FOUND,
  [ERROR_CODE.SUGGESTION_NOT_FOUND]: HttpStatus.NOT_FOUND,
  [ERROR_CODE.ANALYSIS_NOT_FOUND]: HttpStatus.NOT_FOUND,
  [ERROR_CODE.RELATED_WRITING_NOT_FOUND]: HttpStatus.NOT_FOUND,
  [ERROR_CODE.TOKEN_LIMIT_EXCEEDED]: HttpStatus.TOO_MANY_REQUESTS,
  [ERROR_CODE.GEMINI_RATE_LIMITED]: HttpStatus.TOO_MANY_REQUESTS,
  [ERROR_CODE.GEMINI_SERVICE_UNAVAILABLE]: HttpStatus.SERVICE_UNAVAILABLE,
  [ERROR_CODE.TOKEN_LIMIT_CHECK_FAILED]: HttpStatus.INTERNAL_SERVER_ERROR,
  [ERROR_CODE.DOC_LEGACY_NOT_SUPPORTED]: HttpStatus.UNSUPPORTED_MEDIA_TYPE,
  [ERROR_CODE.FILE_TYPE_DOCX_ONLY]: HttpStatus.UNSUPPORTED_MEDIA_TYPE,
  [ERROR_CODE.FILE_INVALID_MIME]: HttpStatus.UNSUPPORTED_MEDIA_TYPE,
};

export interface AppErrorBody {
  statusCode: number;
  errorCode: ErrorCode;
  message: string;
  data?: Record<string, unknown>;
}

export class AppException extends HttpException {
  constructor(
    errorCode: ErrorCode,
    status?: HttpStatus,
    options?: { data?: Record<string, unknown> },
  ) {
    const statusCode = status ?? DEFAULT_STATUS[errorCode] ?? HttpStatus.BAD_REQUEST;
    const body: AppErrorBody = {
      statusCode,
      errorCode,
      message: ERROR_MESSAGES[errorCode],
      ...(options?.data ? { data: options.data } : {}),
    };
    super(body, statusCode);
  }
}

export function throwAppError(
  errorCode: ErrorCode,
  status?: HttpStatus,
  options?: { data?: Record<string, unknown> },
): never {
  throw new AppException(errorCode, status, options);
}
