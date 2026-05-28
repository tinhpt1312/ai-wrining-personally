import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WritingSuggestion, Writing } from 'src/entities';
import { Repository } from 'typeorm';
import { OpenAiProvider } from '../ai/providers/openai.provider';

export interface SuggestionDTO {
  type: string;
  originalText: string;
  suggestedText: string;
  explanation: string;
  confidenceScore: number;
  severity: string;
  position?: { start: number; end: number };
}

export interface GenerateSuggestionsRequest {
  writingId: string;
  focusAreas?: string[]; // grammar, style, clarity, vocabulary, punctuation, tone
}

@Injectable()
export class WritingSuggestionsService {
  private readonly logger = new Logger(WritingSuggestionsService.name);

  constructor(
    @InjectRepository(WritingSuggestion)
    private readonly suggestionRepository: Repository<WritingSuggestion>,
    @InjectRepository(Writing)
    private readonly writingRepository: Repository<Writing>,
    private readonly openAiProvider: OpenAiProvider,
  ) {}

  /**
   * Get all suggestions for a writing
   */
  async getWritingSuggestions(
    writingId: string,
    userId: string,
  ): Promise<WritingSuggestion[]> {
    const writing = await this.writingRepository.findOne({
      where: { id: writingId, userId },
    });

    if (!writing) {
      throw new NotFoundException('Writing not found');
    }

    return await this.suggestionRepository.find({
      where: { writingId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get suggestions by severity
   */
  async getSuggestionsBySeverity(
    writingId: string,
    userId: string,
    severity: string,
  ): Promise<WritingSuggestion[]> {
    const writing = await this.writingRepository.findOne({
      where: { id: writingId, userId },
    });

    if (!writing) {
      throw new NotFoundException('Writing not found');
    }

    return await this.suggestionRepository.find({
      where: { writingId, severity },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Generate suggestions for a writing
   */
  async generateSuggestions(
    writingId: string,
    userId: string,
    req?: GenerateSuggestionsRequest,
  ): Promise<WritingSuggestion[]> {
    const writing = await this.writingRepository.findOne({
      where: { id: writingId, userId },
    });

    if (!writing) {
      throw new NotFoundException('Writing not found');
    }

    // Delete old suggestions
    await this.suggestionRepository.delete({ writingId });

    try {
      // Use AI provider to generate suggestions
      const suggestions = await this.openAiProvider.generateWritingSuggestions(
        writing.content,
        req?.focusAreas || [],
      );

      // Save suggestions to database
      const savedSuggestions: WritingSuggestion[] = [];
      for (const suggestion of suggestions) {
        const entity = this.suggestionRepository.create({
          writingId,
          type: suggestion.type,
          originalText: suggestion.originalText,
          suggestedText: suggestion.suggestedText,
          explanation: suggestion.explanation,
          confidenceScore: suggestion.confidenceScore || 0.8,
          severity: suggestion.severity || 'suggestion',
          position: suggestion.position,
        });

        const saved = await this.suggestionRepository.save(entity);
        savedSuggestions.push(saved);
      }

      this.logger.log(
        `Generated ${savedSuggestions.length} suggestions for writing ${writingId}`,
      );

      return savedSuggestions;
    } catch (error) {
      this.logger.error(`Failed to generate suggestions:`, error);
      throw error;
    }
  }

  /**
   * Apply a suggestion (mark as applied and optionally update writing)
   */
  async applySuggestion(
    suggestionId: string,
    writingId: string,
    userId: string,
    updateWriting: boolean = false,
  ): Promise<WritingSuggestion> {
    const writing = await this.writingRepository.findOne({
      where: { id: writingId, userId },
    });

    if (!writing) {
      throw new NotFoundException('Writing not found');
    }

    const suggestion = await this.suggestionRepository.findOne({
      where: { id: suggestionId, writingId },
    });

    if (!suggestion) {
      throw new NotFoundException('Suggestion not found');
    }

    suggestion.isApplied = true;
    const updated = await this.suggestionRepository.save(suggestion);

    // Optionally update the writing with the suggestion
    if (updateWriting && suggestion.position) {
      writing.content =
        writing.content.substring(0, suggestion.position.start) +
        suggestion.suggestedText +
        writing.content.substring(suggestion.position.end);

      await this.writingRepository.save(writing);
    }

    return updated;
  }

  /**
   * Get applied suggestions count
   */
  async getAppliedSuggestionsCount(writingId: string): Promise<number> {
    return await this.suggestionRepository.count({
      where: { writingId, isApplied: true },
    });
  }

  /**
   * Get suggestion statistics for a writing
   */
  async getSuggestionStats(
    writingId: string,
    userId: string,
  ): Promise<{
    total: number;
    applied: number;
    byType: { type: string; count: number }[];
    bySeverity: { severity: string; count: number }[];
  }> {
    const writing = await this.writingRepository.findOne({
      where: { id: writingId, userId },
    });

    if (!writing) {
      throw new NotFoundException('Writing not found');
    }

    const suggestions = await this.suggestionRepository.find({
      where: { writingId },
    });

    const applied = suggestions.filter((s) => s.isApplied).length;

    // Group by type
    const byType = new Map<string, number>();
    suggestions.forEach((s) => {
      byType.set(s.type, (byType.get(s.type) || 0) + 1);
    });

    // Group by severity
    const bySeverity = new Map<string, number>();
    suggestions.forEach((s) => {
      bySeverity.set(s.severity, (bySeverity.get(s.severity) || 0) + 1);
    });

    return {
      total: suggestions.length,
      applied,
      byType: Array.from(byType.entries()).map(([type, count]) => ({
        type,
        count,
      })),
      bySeverity: Array.from(bySeverity.entries()).map(([severity, count]) => ({
        severity,
        count,
      })),
    };
  }

  /**
   * Get refactored version of the writing
   */
  async getRefactoredVersion(
    writingId: string,
    userId: string,
  ): Promise<{ original: string; refactored: string }> {
    const writing = await this.writingRepository.findOne({
      where: { id: writingId, userId },
    });

    if (!writing) {
      throw new NotFoundException('Writing not found');
    }

    const appliedSuggestions = await this.suggestionRepository.find({
      where: { writingId, isApplied: true },
      order: { createdAt: 'ASC' },
    });

    let refactored = writing.content;

    // Apply suggestions (need to adjust positions as we go)
    const sortedByPosition = appliedSuggestions.sort((a, b) => {
      const aPos = a.position?.start || 0;
      const bPos = b.position?.start || 0;
      return bPos - aPos; // Reverse order to adjust from end first
    });

    for (const suggestion of sortedByPosition) {
      if (suggestion.position) {
        refactored =
          refactored.substring(0, suggestion.position.start) +
          suggestion.suggestedText +
          refactored.substring(suggestion.position.end);
      }
    }

    return { original: writing.content, refactored };
  }

  /**
   * Get high-confidence suggestions only
   */
  async getHighConfidenceSuggestions(
    writingId: string,
    userId: string,
    threshold: number = 0.8,
  ): Promise<WritingSuggestion[]> {
    const writing = await this.writingRepository.findOne({
      where: { id: writingId, userId },
    });

    if (!writing) {
      throw new NotFoundException('Writing not found');
    }

    return await this.suggestionRepository.find({
      where: { writingId },
      order: { confidenceScore: 'DESC' },
    });

    // Filter in code for better control
    // .filter((s) => s.confidenceScore >= threshold);
  }
}
