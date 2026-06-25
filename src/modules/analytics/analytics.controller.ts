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
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import type { RequestWithUser } from 'src/types';
import { AnalyticsService } from './analytics.service';
import { ExportService } from './services/export.service';
import { buildAttachmentDisposition } from 'src/common/utils/content-disposition.util';
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
    private readonly exportService: ExportService,
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
   * Learning progress for dashboard
   */
  @Get('progress')
  async getProgress(@Req() req: RequestWithUser) {
    const userId = req.user?.userId;
    return this.analyticsService.getProgress(userId);
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
   * Export analysis report as DOCX
   */
  @Get(':id/export/docx')
  async exportDocx(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
    @Res() res: Response,
  ): Promise<void> {
    const userId = req.user?.userId;
    const { buffer, fileName } = await this.exportService.exportDocx(
      id,
      userId,
    );
    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': buildAttachmentDisposition(fileName),
      'Content-Length': buffer.length,
    });
    res.send(buffer);
  }

  /**
   * Export analysis report as PDF
   */
  @Get(':id/export/pdf')
  async exportPdf(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
    @Res() res: Response,
  ): Promise<void> {
    const userId = req.user?.userId;
    const { buffer, fileName } = await this.exportService.exportPdf(
      id,
      userId,
    );
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': buildAttachmentDisposition(fileName),
      'Content-Length': buffer.length,
    });
    res.send(buffer);
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
