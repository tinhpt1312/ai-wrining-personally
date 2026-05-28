import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Achievement,
  UserAchievement,
  UserStat,
  UserStreak,
} from 'src/entities';
import { Repository } from 'typeorm';

@Injectable()
export class AchievementsService {
  private readonly logger = new Logger(AchievementsService.name);

  constructor(
    @InjectRepository(Achievement)
    private readonly achievementRepository: Repository<Achievement>,
    @InjectRepository(UserAchievement)
    private readonly userAchievementRepository: Repository<UserAchievement>,
    @InjectRepository(UserStat)
    private readonly userStatRepository: Repository<UserStat>,
    @InjectRepository(UserStreak)
    private readonly userStreakRepository: Repository<UserStreak>,
  ) {}

  /**
   * Get all achievements
   */
  async getAllAchievements(): Promise<Achievement[]> {
    return await this.achievementRepository.find({
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Get user's achievements progress
   */
  async getUserAchievements(userId: string): Promise<UserAchievement[]> {
    return await this.userAchievementRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      relations: { achievement: true },
    });
  }

  /**
   * Get unlocked achievements only
   */
  async getUnlockedAchievements(userId: string): Promise<UserAchievement[]> {
    return await this.userAchievementRepository.find({
      where: { userId, isUnlocked: true },
      order: { unlockedAt: 'DESC' },
      relations: { achievement: true },
    });
  }

  /**
   * Get achievement detail with user progress
   */
  async getAchievementDetail(
    achievementId: string,
    userId: string,
  ): Promise<{ achievement: Achievement; userProgress: UserAchievement }> {
    const achievement = await this.achievementRepository.findOne({
      where: { id: achievementId },
    });

    if (!achievement) {
      throw new NotFoundException('Achievement not found');
    }

    let userProgress = await this.userAchievementRepository.findOne({
      where: { achievementId, userId },
    });

    if (!userProgress) {
      userProgress = this.userAchievementRepository.create({
        achievementId,
        userId,
        progress: 0,
        isUnlocked: false,
      });
      userProgress = await this.userAchievementRepository.save(userProgress);
    }

    return { achievement, userProgress };
  }

  /**
   * Initialize achievements for a new user
   */
  async initializeUserAchievements(userId: string): Promise<void> {
    const achievements = await this.achievementRepository.find();

    for (const achievement of achievements) {
      const existing = await this.userAchievementRepository.findOne({
        where: { userId, achievementId: achievement.id },
      });

      if (!existing) {
        const userAchievement = this.userAchievementRepository.create({
          userId,
          achievementId: achievement.id,
          progress: 0,
          isUnlocked: false,
        });
        await this.userAchievementRepository.save(userAchievement);
      }
    }

    // Initialize user streak
    const existingStreak = await this.userStreakRepository.findOne({
      where: { userId },
    });

    if (!existingStreak) {
      const streak = this.userStreakRepository.create({ userId });
      await this.userStreakRepository.save(streak);
    }

    // Initialize user stats
    const existingStats = await this.userStatRepository.findOne({
      where: { userId },
    });

    if (!existingStats) {
      const stats = this.userStatRepository.create({ userId });
      await this.userStatRepository.save(stats);
    }
  }

  /**
   * Update achievement progress and check for unlock
   */
  async updateAchievementProgress(
    userId: string,
    achievementKey: string,
    currentValue: number,
  ): Promise<UserAchievement | null> {
    const achievement = await this.achievementRepository.findOne({
      where: { key: achievementKey },
    });

    if (!achievement) {
      return null;
    }

    let userAchievement = await this.userAchievementRepository.findOne({
      where: { userId, achievementId: achievement.id },
    });

    if (!userAchievement) {
      userAchievement = this.userAchievementRepository.create({
        userId,
        achievementId: achievement.id,
      });
    }

    userAchievement.progress = currentValue;

    // Check if achievement should be unlocked
    if (
      !userAchievement.isUnlocked &&
      currentValue >= achievement.requirementValue
    ) {
      userAchievement.isUnlocked = true;
      userAchievement.unlockedAt = new Date();

      // Award points to user
      const userStat = await this.userStatRepository.findOne({
        where: { userId },
      });

      if (userStat) {
        userStat.totalPoints += achievement.pointsReward;
        userStat.badgesCount += 1;
        userStat.level = Math.floor(userStat.totalPoints / 100) + 1;
        await this.userStatRepository.save(userStat);
      }

      this.logger.log(
        `Achievement unlocked for user ${userId}: ${achievementKey}`,
      );
    }

    return await this.userAchievementRepository.save(userAchievement);
  }

  /**
   * Update streak for user
   */
  async updateStreak(userId: string): Promise<UserStreak> {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    let streak = await this.userStreakRepository.findOne({
      where: { userId },
    });

    if (!streak) {
      streak = this.userStreakRepository.create({
        userId,
        currentStreakCount: 1,
        streakStartDate: today,
        lastActivityDate: today,
        totalDaysActive: 1,
      });
    } else {
      const lastActivityDate = streak.lastActivityDate
        ? new Date(streak.lastActivityDate)
        : null;
      lastActivityDate?.setUTCHours(0, 0, 0, 0);

      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      if (lastActivityDate?.getTime() === today.getTime()) {
        // Already active today, don't update
        return streak;
      } else if (lastActivityDate?.getTime() === yesterday.getTime()) {
        // Continue streak
        streak.currentStreakCount += 1;
        streak.totalDaysActive += 1;
      } else {
        // Streak broken, start new one
        streak.currentStreakCount = 1;
        streak.streakStartDate = today;
        streak.totalDaysActive += 1;
      }

      streak.lastActivityDate = today;

      // Update longest streak
      if (streak.currentStreakCount > streak.longestStreakCount) {
        streak.longestStreakCount = streak.currentStreakCount;
      }
    }

    const savedStreak = await this.userStreakRepository.save(streak);

    // Update achievement for streaks
    await this.updateAchievementProgress(
      userId,
      'STREAK_7_DAYS',
      Math.min(savedStreak.currentStreakCount, 7),
    );
    await this.updateAchievementProgress(
      userId,
      'STREAK_30_DAYS',
      Math.min(savedStreak.currentStreakCount, 30),
    );

    return savedStreak;
  }

  /**
   * Get user stats summary
   */
  async getUserStats(userId: string): Promise<UserStat> {
    let stats = await this.userStatRepository.findOne({
      where: { userId },
    });

    if (!stats) {
      stats = this.userStatRepository.create({ userId });
      stats = await this.userStatRepository.save(stats);
    }

    return stats;
  }

  /**
   * Get leaderboard (top users by points)
   */
  async getLeaderboard(
    limit: number = 10,
    offset: number = 0,
  ): Promise<{
    users: UserStat[];
    total: number;
  }> {
    const [users, total] = await this.userStatRepository.findAndCount({
      order: { totalPoints: 'DESC' },
      take: limit,
      skip: offset,
    });

    return { users, total };
  }

  /**
   * Create initial achievements (seeding)
   */
  async createInitialAchievements(): Promise<void> {
    const initialAchievements = [
      {
        key: 'FIRST_WRITING',
        name: '🎯 Getting Started',
        description: 'Submit your first writing',
        iconEmoji: '🎯',
        badgeColor: 'blue',
        pointsReward: 10,
        requirementType: 'SUBMISSION_COUNT',
        requirementValue: 1,
      },
      {
        key: 'WRITE_10',
        name: '📚 Growing Writer',
        description: 'Submit 10 writings',
        iconEmoji: '📚',
        badgeColor: 'silver',
        pointsReward: 50,
        requirementType: 'SUBMISSION_COUNT',
        requirementValue: 10,
      },
      {
        key: 'WRITE_50',
        name: '✨ Prolific Author',
        description: 'Submit 50 writings',
        iconEmoji: '✨',
        badgeColor: 'gold',
        pointsReward: 200,
        requirementType: 'SUBMISSION_COUNT',
        requirementValue: 50,
      },
      {
        key: 'STREAK_7_DAYS',
        name: '🔥 Week Warrior',
        description: 'Maintain a 7-day writing streak',
        iconEmoji: '🔥',
        badgeColor: 'gold',
        pointsReward: 100,
        requirementType: 'STREAK',
        requirementValue: 7,
      },
      {
        key: 'STREAK_30_DAYS',
        name: '💪 Unstoppable',
        description: 'Maintain a 30-day writing streak',
        iconEmoji: '💪',
        badgeColor: 'gold',
        pointsReward: 500,
        requirementType: 'STREAK',
        requirementValue: 30,
      },
      {
        key: 'WORDS_1000',
        name: '📖 Wordsmith',
        description: 'Write 1,000 total words',
        iconEmoji: '📖',
        badgeColor: 'silver',
        pointsReward: 75,
        requirementType: 'WORD_COUNT',
        requirementValue: 1000,
      },
      {
        key: 'HIGH_SCORE',
        name: '⭐ Excellence Seeker',
        description: 'Maintain a 90+ average score',
        iconEmoji: '⭐',
        badgeColor: 'gold',
        pointsReward: 150,
        requirementType: 'SCORE_AVERAGE',
        requirementValue: 90,
      },
    ];

    for (const ach of initialAchievements) {
      const existing = await this.achievementRepository.findOne({
        where: { key: ach.key },
      });

      if (!existing) {
        const achievement = this.achievementRepository.create(ach);
        await this.achievementRepository.save(achievement);
      }
    }

    this.logger.log('Initial achievements created');
  }
}
