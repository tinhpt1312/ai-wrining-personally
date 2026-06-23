import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
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
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }

    try {
      const usage = await this.tokenTrackerService.getCurrentDayUsage(userId);
      const estimatedTokens = 2000;

      if (usage.remaining < estimatedTokens) {
        this.logger.warn(
          `Token limit exceeded for user ${userId}. Used: ${usage.used}/${usage.limit}`,
        );

        throw new HttpException(
          {
            message: 'Daily token limit exceeded',
            data: {
              tokensUsed: usage.used,
              tokensLimit: usage.limit,
              remaining: usage.remaining,
            },
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      request['tokenUsageInfo'] = usage;

      return true;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error('Token limit guard error:', error);
      throw new HttpException(
        'Failed to check token limit',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
