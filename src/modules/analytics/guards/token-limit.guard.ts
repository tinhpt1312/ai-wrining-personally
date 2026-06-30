import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ERROR_CODE } from 'src/constants';
import { AppException, throwAppError } from 'src/common/app.exception';
import { TokenTrackerService } from '../services/token-tracker.service';
import { RequestWithUser } from '../../../types/auth.type';

@Injectable()
export class TokenLimitGuard implements CanActivate {
  private readonly logger = new Logger(TokenLimitGuard.name);

  constructor(private readonly tokenTrackerService: TokenTrackerService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const userId = request.user?.userId;

    if (!userId) {
      this.logger.warn('Token limit guard: No user ID in request');
      throwAppError(ERROR_CODE.ACCESS_DENIED, HttpStatus.UNAUTHORIZED);
    }

    try {
      const usage = await this.tokenTrackerService.getCurrentDayUsage(userId);
      const estimatedTokens = 2000;

      if (usage.remaining < estimatedTokens) {
        this.logger.warn(
          `Token limit exceeded for user ${userId}. Used: ${usage.used}/${usage.limit}`,
        );

        throwAppError(ERROR_CODE.TOKEN_LIMIT_EXCEEDED, HttpStatus.TOO_MANY_REQUESTS, {
          data: {
            tokensUsed: usage.used,
            tokensLimit: usage.limit,
            remaining: usage.remaining,
          },
        });
      }

      request['tokenUsageInfo'] = usage;

      return true;
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }

      this.logger.error('Token limit guard error:', error);
      throwAppError(ERROR_CODE.TOKEN_LIMIT_CHECK_FAILED);
    }
  }
}
