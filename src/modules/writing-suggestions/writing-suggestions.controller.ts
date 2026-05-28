import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  UseGuards,
  Request,
  Body,
} from '@nestjs/common';
import { WritingSuggestionsService } from './writing-suggestions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('api/writing-suggestions')
@UseGuards(JwtAuthGuard)
export class WritingSuggestionsController {
  constructor(private readonly suggestionsService: WritingSuggestionsService) {}

  /**
   * Get all suggestions for a writing
   */
  @Get('writing/:writingId')
  async getWritingSuggestions(
    @Param('writingId') writingId: string,
    @Request() req: any,
  ) {
    const suggestions = await this.suggestionsService.getWritingSuggestions(
      writingId,
      req.user.id,
    );
    return { data: suggestions };
  }

  /**
   * Generate suggestions for a writing
   */
  @Post('generate')
  async generateSuggestions(
    @Request() req: any,
    @Body() body: { writingId: string; focusAreas?: string[] },
  ) {
    const suggestions = await this.suggestionsService.generateSuggestions(
      body.writingId,
      req.user.id,
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
    @Request() req: any,
  ) {
    const suggestions = await this.suggestionsService.getSuggestionsBySeverity(
      writingId,
      req.user.id,
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
    @Request() req: any,
  ) {
    const suggestion = await this.suggestionsService.applySuggestion(
      suggestionId,
      writingId,
      req.user.id,
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
    @Request() req: any,
  ) {
    const stats = await this.suggestionsService.getSuggestionStats(
      writingId,
      req.user.id,
    );
    return { data: stats };
  }

  /**
   * Get refactored version
   */
  @Get('writing/:writingId/refactored')
  async getRefactoredVersion(
    @Param('writingId') writingId: string,
    @Request() req: any,
  ) {
    const refactored = await this.suggestionsService.getRefactoredVersion(
      writingId,
      req.user.id,
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
    @Request() req: any,
  ) {
    const suggestions =
      await this.suggestionsService.getHighConfidenceSuggestions(
        writingId,
        req.user.id,
        parseFloat(threshold),
      );
    return { data: suggestions };
  }
}
