import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserTokenUsage } from '../../../entities/user-token-usage.entity';
import { ENV } from '../../../config/env.config';
import { TokenUsageInfo } from '../../ai/types/ai.types';

@Injectable()
export class TokenTrackerService {
  private readonly logger = new Logger(TokenTrackerService.name);
  private readonly dailyLimit = ENV.ONEROUTER.DAILY_TOKEN_LIMIT;
  private readonly bufferPercent = ENV.ONEROUTER.TOKEN_BUFFER_PERCENT;

  constructor(
    @InjectRepository(UserTokenUsage)
    private readonly tokenUsageRepository: Repository<UserTokenUsage>,
  ) {}

  /**
   * Get current day's token usage info for a user
   */
  async getCurrentDayUsage(userId: string): Promise<TokenUsageInfo> {
    const today = this.getTodayDate();

    let usage = await this.tokenUsageRepository.findOne({
      where: { userId, date: today },
    });

    // Create if doesn't exist
    if (!usage) {
      usage = this.tokenUsageRepository.create({
        userId,
        date: today,
        tokensUsed: 0,
        tokensLimit: this.dailyLimit,
      });
      await this.tokenUsageRepository.save(usage);
    }

    return this.formatUsageInfo(usage);
  }

  /**
   * Get remaining token budget for user
   */
  async getRemainingBudget(userId: string): Promise<number> {
    const usage = await this.getCurrentDayUsage(userId);
    return usage.remaining;
  }

  /**
   * Check if user has enough budget for an analysis
   */
  async hasBudget(userId: string, estimatedTokens: number): Promise<boolean> {
    const remaining = await this.getRemainingBudget(userId);
    // Include 10% buffer for actual token usage variance
    const bufferTokens = Math.ceil(estimatedTokens * (1 + this.bufferPercent));
    return remaining >= bufferTokens;
  }

  /**
   * Record token usage after analysis
   */
  async recordTokenUsage(
    userId: string,
    tokensUsed: number,
    analysisId?: string,
  ): Promise<TokenUsageInfo> {
    const today = this.getTodayDate();

    let usage = await this.tokenUsageRepository.findOne({
      where: { userId, date: today },
    });

    if (!usage) {
      usage = this.tokenUsageRepository.create({
        userId,
        date: today,
        tokensUsed: 0,
        tokensLimit: this.dailyLimit,
      });
    }

    usage.tokensUsed += tokensUsed;
    await this.tokenUsageRepository.save(usage);

    this.logger.debug(
      `Recorded ${tokensUsed} tokens for user ${userId}. Total today: ${usage.tokensUsed}/${this.dailyLimit}`,
      analysisId ? { analysisId } : {},
    );

    return this.formatUsageInfo(usage);
  }

  /**
   * Get usage statistics for a user (last 7 days)
   */
  async getUsageStats(userId: string): Promise<any[]> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    return this.tokenUsageRepository.find({
      where: {
        userId,
      },
      order: { date: 'DESC' },
      take: 7,
    });
  }

  /**
   * Reset daily budget for a specific user (used in migrations)
   */
  async resetUserBudget(userId: string): Promise<void> {
    const today = this.getTodayDate();

    let usage = await this.tokenUsageRepository.findOne({
      where: { userId, date: today },
    });

    if (!usage) {
      usage = this.tokenUsageRepository.create({
        userId,
        date: today,
        tokensUsed: 0,
        tokensLimit: this.dailyLimit,
      });
    } else {
      usage.tokensUsed = 0;
    }

    await this.tokenUsageRepository.save(usage);
    this.logger.debug(`Reset budget for user ${userId}`);
  }

  /**
   * Reset all users' daily budgets (called by cron job)
   * Should run at midnight UTC
   */
  async resetAllDailyBudgets(): Promise<number> {
    const today = this.getTodayDate();

    // Create entry for all active users if not exists
    // This ensures tracking continuity
    const result = await this.tokenUsageRepository.query(
      `
      INSERT INTO user_token_usage (user_id, date, tokens_used, tokens_limit, created_at, updated_at)
      SELECT DISTINCT users.id, $1::date, 0, $2::integer, NOW(), NOW()
      FROM users
      WHERE NOT EXISTS (
        SELECT 1 FROM user_token_usage
        WHERE user_id = users.id AND date = $1::date
      )
      ON CONFLICT (user_id, date) DO NOTHING
    `,
      [today, this.dailyLimit],
    );

    const resetCount = result.affectedRows || 0;
    this.logger.log(`Reset daily budgets for ${resetCount} users`);

    return resetCount;
  }

  /**
   * Get total tokens used across all users (for analytics)
   */
  async getTotalTokensUsedToday(): Promise<number> {
    const today = this.getTodayDate();

    const result = await this.tokenUsageRepository
      .createQueryBuilder('utu')
      .select('SUM(utu.tokens_used)', 'total')
      .where('utu.date = :date', { date: today })
      .getRawOne();

    return result?.total || 0;
  }

  /**
   * Helper: Get today's date at midnight UTC
   */
  private getTodayDate(): Date {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    return today;
  }

  /**
   * Helper: Format usage into readable object
   */
  private formatUsageInfo(usage: UserTokenUsage): TokenUsageInfo {
    const remaining = Math.max(0, usage.tokensLimit - usage.tokensUsed);
    const percentage = (usage.tokensUsed / usage.tokensLimit) * 100;

    // Calculate reset time (next day at midnight UTC)
    const resetAt = new Date(usage.date);
    resetAt.setDate(resetAt.getDate() + 1);
    resetAt.setUTCHours(0, 0, 0, 0);

    return {
      used: usage.tokensUsed,
      remaining,
      limit: usage.tokensLimit,
      percentage: Math.round(percentage),
      resetAt: resetAt.toISOString(),
    };
  }
}
