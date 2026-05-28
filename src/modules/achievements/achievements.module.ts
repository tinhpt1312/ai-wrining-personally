import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Achievement,
  UserAchievement,
  UserStat,
  UserStreak,
} from 'src/entities';
import { AchievementsService } from './achievements.service';
import { AchievementsController } from './achievements.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Achievement,
      UserAchievement,
      UserStat,
      UserStreak,
    ]),
  ],
  providers: [AchievementsService],
  controllers: [AchievementsController],
  exports: [AchievementsService],
})
export class AchievementsModule implements OnModuleInit {
  constructor(private readonly achievementsService: AchievementsService) {}

  async onModuleInit() {
    // Create initial achievements on module startup
    await this.achievementsService.createInitialAchievements();
  }
}
