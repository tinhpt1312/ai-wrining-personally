import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import type { RequestWithUser } from 'src/types';
import { AnalyticsService } from './analytics.service';
import {
  CreateAnalyticsDTO,
  QueryAnalyticsDTO,
  UpdateAnalyticsDTO,
  CreateAiAnalyticsDTO,
} from './dto';
import { TokenLimitGuard } from './guards/token-limit.guard';
import { TokenTrackerService } from './services/token-tracker.service';

@ApiTags('analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly tokenTrackerService: TokenTrackerService,
  ) {}

  /**
   * Create a new analysis for a writing
   */
  @Post()
  async create(@Body() dto: CreateAnalyticsDTO, @Req() req: RequestWithUser) {
    const userId = req.user?.userId;
    return this.analyticsService.create(userId, dto);
  }

  /**
   * Create analysis with AI-generated feedback
   * Protected by token limit guard - checks if user has budget
   */
  @UseGuards(TokenLimitGuard)
  @Post('ai')
  async createWithAiAnalytics(
    @Body() dto: CreateAiAnalyticsDTO,
    @Req() req: RequestWithUser,
  ) {
    const userId = req.user?.userId;
    return this.analyticsService.createWithAiAnalytics(userId, dto);
  }

  /**
   * Get current user's token usage for today
   */
  @Get('tokens/usage')
  async getTokenUsage(@Req() req: RequestWithUser) {
    const userId = req.user?.userId;
    return this.tokenTrackerService.getCurrentDayUsage(userId);
  }

  /**
   * Get token usage statistics (last 7 days)
   */
  @Get('tokens/stats')
  async getTokenStats(@Req() req: RequestWithUser) {
    const userId = req.user?.userId;
    return this.tokenTrackerService.getUsageStats(userId);
  }

  /**
   * Get all analyses for the current user
   */
  @Get()
  async findAll(
    @Query() query: QueryAnalyticsDTO,
    @Req() req: RequestWithUser,
  ) {
    const userId = req.user?.userId;
    return this.analyticsService.findAll(userId, query);
  }

  /**
   * Get a single analysis by ID
   */
  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: RequestWithUser) {
    const userId = req.user?.userId;
    return this.analyticsService.findOne(id, userId);
  }

  /**
   * Get all analyses for a specific writing
   */
  @Get('writing/:writingId')
  async findByWritingId(
    @Param('writingId') writingId: string,
    @Req() req: RequestWithUser,
  ) {
    const userId = req.user?.userId;
    return this.analyticsService.findByWritingId(writingId, userId);
  }

  /**
   * Update an analysis
   */
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateAnalyticsDTO,
    @Req() req: RequestWithUser,
  ) {
    const userId = req.user?.userId;
    return this.analyticsService.update(id, userId, dto);
  }

  /**
   * Delete an analysis
   */
  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
  ): Promise<{ message: string }> {
    const userId = req.user?.userId;
    return this.analyticsService.remove(id, userId);
  }

  /**
   * Get analysis statistics
   */
  @Get('stats/overview')
  async getStats(@Req() req: RequestWithUser) {
    const userId = req.user?.userId;
    return this.analyticsService.getStats(userId);
  }
}
