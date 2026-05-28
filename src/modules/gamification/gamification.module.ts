import { Module } from '@nestjs/common';
import { AchievementsModule } from '../achievements/achievements.module';
import { FeedbackCategoriesModule } from '../feedback-categories/feedback-categories.module';

/**
 * Gamification module that coordinates achievements,
 * streaks, and feedback categories for user engagement
 */
@Module({
  imports: [AchievementsModule, FeedbackCategoriesModule],
  exports: [AchievementsModule, FeedbackCategoriesModule],
})
export class GamificationModule {}
