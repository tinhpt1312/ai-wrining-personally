import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TokenTrackerService } from './token-tracker.service';

@Injectable()
export class TokenResetScheduler {
  private readonly logger = new Logger(TokenResetScheduler.name);

  constructor(private readonly tokenTrackerService: TokenTrackerService) {}

  /**
   * Reset daily token budgets for all users at midnight UTC
   * Runs every day at 00:00:00 UTC
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, {
    timeZone: 'UTC',
  })
  async resetDailyBudgets(): Promise<void> {
    try {
      this.logger.log('Starting daily token budget reset...');
      const resetCount = await this.tokenTrackerService.resetAllDailyBudgets();
      this.logger.log(
        `Daily token budget reset completed. Reset for ${resetCount} users.`,
      );
    } catch (error) {
      this.logger.error('Error resetting daily token budgets:', error);
    }
  }
}
