import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  UseGuards,
  Req,
  Body,
} from '@nestjs/common';
import { WritingSuggestionsService } from './writing-suggestions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { RequestWithUser } from 'src/types';

@Controller('writing-suggestions')
@UseGuards(JwtAuthGuard)
export class WritingSuggestionsController {
  constructor(private readonly suggestionsService: WritingSuggestionsService) {}

  /**
   * Get all suggestions for a writing
   */
  @Get('writing/:writingId')
  async getWritingSuggestions(
    @Param('writingId') writingId: string,
    @Req() req: RequestWithUser,
  ) {
    const suggestions = await this.suggestionsService.getWritingSuggestions(
      writingId,
      req.user.userId,
    );
    return { data: suggestions };
  }

  /**
   * Generate suggestions from an existing grading report
   */
  @Post('generate-from-analysis')
  async generateFromAnalysis(
    @Req() req: RequestWithUser,
    @Body() body: { writingId: string; analysisId: string },
  ) {
    const suggestions = await this.suggestionsService.generateFromAnalysis(
      body.writingId,
      body.analysisId,
      req.user.userId,
    );
    return { data: suggestions };
  }

  /**
   * Generate suggestions for a writing
   */
  @Post('generate')
  async generateSuggestions(
    @Req() req: RequestWithUser,
    @Body() body: { writingId: string; focusAreas?: string[] },
  ) {
    const suggestions = await this.suggestionsService.generateSuggestions(
      body.writingId,
      req.user.userId,
      body,
    );
    return { data: suggestions };
  }

  /**
   * Get suggestions by severity
   */
  @Get('writing/:writingId/severity/:severity')
  async getSuggestionsBySeverity(
    @Param('writingId') writingId: string,
    @Param('severity') severity: string,
    @Req() req: RequestWithUser,
  ) {
    const suggestions = await this.suggestionsService.getSuggestionsBySeverity(
      writingId,
      req.user.userId,
      severity,
    );
    return { data: suggestions };
  }

  /**
   * Apply a suggestion
   */
  @Patch(':id/apply')
  async applySuggestion(
    @Param('id') suggestionId: string,
    @Query('writingId') writingId: string,
    @Query('updateWriting') updateWriting: string = 'false',
    @Req() req: RequestWithUser,
  ) {
    const suggestion = await this.suggestionsService.applySuggestion(
      suggestionId,
      writingId,
      req.user.userId,
      updateWriting === 'true',
    );
    return { data: suggestion };
  }

  /**
   * Get suggestion statistics
   */
  @Get('writing/:writingId/stats')
  async getSuggestionStats(
    @Param('writingId') writingId: string,
    @Req() req: RequestWithUser,
  ) {
    const stats = await this.suggestionsService.getSuggestionStats(
      writingId,
      req.user.userId,
    );
    return { data: stats };
  }

  /**
   * Get refactored version
   */
  @Get('writing/:writingId/refactored')
  async getRefactoredVersion(
    @Param('writingId') writingId: string,
    @Req() req: RequestWithUser,
  ) {
    const refactored = await this.suggestionsService.getRefactoredVersion(
      writingId,
      req.user.userId,
    );
    return { data: refactored };
  }

  /**
   * Get high confidence suggestions
   */
  @Get('writing/:writingId/high-confidence')
  async getHighConfidenceSuggestions(
    @Param('writingId') writingId: string,
    @Query('threshold') threshold: string = '0.8',
    @Req() req: RequestWithUser,
  ) {
    const suggestions =
      await this.suggestionsService.getHighConfidenceSuggestions(
        writingId,
        req.user.userId,
        parseFloat(threshold),
      );
    return { data: suggestions };
  }
}
