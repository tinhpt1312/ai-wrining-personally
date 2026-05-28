import {
  Controller,
  Get,
  Param,
  Request,
  UseGuards,
  Query,
} from '@nestjs/common';
import { AchievementsService } from './achievements.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('api/achievements')
@UseGuards(JwtAuthGuard)
export class AchievementsController {
  constructor(private readonly achievementsService: AchievementsService) {}

  /**
   * Get all achievements
   */
  @Get('all')
  async getAllAchievements() {
    const achievements = await this.achievementsService.getAllAchievements();
    return { data: achievements };
  }

  /**
   * Get user's achievements
   */
  @Get('my')
  async getUserAchievements(@Request() req: any) {
    const achievements = await this.achievementsService.getUserAchievements(
      req.user.id,
    );
    return { data: achievements };
  }

  /**
   * Get unlocked achievements
   */
  @Get('unlocked')
  async getUnlockedAchievements(@Request() req: any) {
    const achievements = await this.achievementsService.getUnlockedAchievements(
      req.user.id,
    );
    return { data: achievements };
  }

  /**
   * Get achievement detail
   */
  @Get(':id')
  async getAchievementDetail(
    @Param('id') achievementId: string,
    @Request() req: any,
  ) {
    const result = await this.achievementsService.getAchievementDetail(
      achievementId,
      req.user.id,
    );
    return result;
  }

  /**
   * Get user stats
   */
  @Get('stats/my')
  async getUserStats(@Request() req: any) {
    const stats = await this.achievementsService.getUserStats(req.user.id);
    return { data: stats };
  }

  /**
   * Get leaderboard
   */
  @Get('leaderboard/top')
  async getLeaderboard(
    @Query('limit') limit: string = '10',
    @Query('offset') offset: string = '0',
  ) {
    const result = await this.achievementsService.getLeaderboard(
      parseInt(limit),
      parseInt(offset),
    );
    return result;
  }
}
