import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ERROR_CODE } from 'src/constants';
import {
  AppException,
  throwAppError,
} from 'src/common/app.exception';
import { Analytics, Writing } from 'src/entities';
import { Repository } from 'typeorm';
import {
  CreateAnalyticsDTO,
  QueryAnalyticsDTO,
  UpdateAnalyticsDTO,
  CreateAiAnalyticsDTO,
} from './dto';
import { GeminiProvider } from '../../shared/ai/providers/gemini.provider';
import { PromptTemplatesService } from '../../shared/ai/services/prompt-templates.service';
import { ResponseParserService } from './services/response-parser.service';
import { TokenTrackerService } from './services/token-tracker.service';
import { TokenEstimator } from '../../utils/token-estimator';
import { AiErrorHandler } from '../../utils/ai-error-handler';
import type { AiErrorDetails } from '../../types/ai.type';
import { WritingType } from '../../types/ai.type';
import {
  computeCriterionAverages,
  computeWritingStreak,
  findWeakestCriterion,
  getOverallScore,
} from './utils/progress.util';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    @InjectRepository(Analytics)
    private readonly analysisRepository: Repository<Analytics>,
    @InjectRepository(Writing)
    private readonly writingRepository: Repository<Writing>,
    private readonly geminiProvider: GeminiProvider,
    private readonly promptTemplatesService: PromptTemplatesService,
    private readonly responseParserService: ResponseParserService,
    private readonly tokenTrackerService: TokenTrackerService,
  ) {}

  /**
   * Create a new analysis for a writing
   */
  async create(userId: string, dto: CreateAnalyticsDTO): Promise<Analytics> {
    if (!userId) {
      throwAppError(ERROR_CODE.USER_ID_REQUIRED);
    }

    if (!dto.writingId) {
      throwAppError(ERROR_CODE.WRITING_ID_REQUIRED);
    }

    // Verify writing exists and belongs to the user
    const writing = await this.writingRepository.findOne({
      where: {
        id: dto.writingId,
        userId,
      },
    });

    if (!writing) {
      throwAppError(ERROR_CODE.WRITING_NOT_FOUND);
    }

    const analysis = new Analytics();
    analysis.userId = userId;
    analysis.writingId = dto.writingId;
    analysis.feedbackJson = dto.feedbackJson;

    return this.analysisRepository.save(analysis);
  }

  /**
   * Create analysis with AI-generated feedback
   * Handles token budget checks, AI generation, response parsing, and token tracking
   */
  async createWithAiAnalytics(
    userId: string,
    dto: CreateAiAnalyticsDTO,
  ): Promise<{
    analysis: Analytics;
    tokensUsed: number;
    error?: AiErrorDetails;
  }> {
    if (!userId) {
      throwAppError(ERROR_CODE.USER_ID_REQUIRED);
    }

    if (!dto.writingId) {
      throwAppError(ERROR_CODE.WRITING_ID_REQUIRED);
    }

    // Verify writing exists and belongs to the user
    const writing = await this.writingRepository.findOne({
      where: {
        id: dto.writingId,
        userId,
      },
    });

    if (!writing) {
      throwAppError(ERROR_CODE.WRITING_NOT_FOUND);
    }

    try {
      // Step 1: Determine writing type for prompt selection
      const writingType =
        (dto.writingType as WritingType) ||
        this.mapWritingTypeToAnalyticsType(writing.type);

      // Step 2: Generate prompt
      const prompt = this.promptTemplatesService.getPrompt(
        writing,
        writingType,
      );

      const estimatedTokens = TokenEstimator.estimateTotalTokens(prompt, 2000);

      this.logger.debug(
        `Estimated tokens for analysis: ${estimatedTokens} for writing ${writing.id}`,
      );

      // Step 3: Check token budget
      const hasBudget = await this.tokenTrackerService.hasBudget(
        userId,
        estimatedTokens,
      );
      if (!hasBudget) {
        throwAppError(ERROR_CODE.TOKEN_LIMIT_EXCEEDED);
      }

      // Step 4: Call Gemini API
      this.logger.debug(`Calling Gemini API for writing ${writing.id}`);
      const aiResponse = await this.geminiProvider.generateAnalytics({
        prompt,
        maxTokens: 4500,
      });

      // Step 5: Parse and validate response
      const parseResult = this.responseParserService.parseAndValidate(
        aiResponse.text,
      );

      if (!parseResult.valid || !parseResult.data) {
        const errors = parseResult.errors || ['Unable to parse AI response'];
        this.logger.error(
          `AI response validation failed for writing ${writing.id}: ${errors.join(', ')}`,
        );

        throwAppError(ERROR_CODE.AI_INVALID_RESPONSE);
      }

      const parsed = parseResult.data;

      const existingCount = await this.analysisRepository.count({
        where: { writingId: dto.writingId, userId },
      });

      let previousScore: number | null = null;
      if (dto.previousAnalysisId) {
        const previous = await this.analysisRepository.findOne({
          where: {
            id: dto.previousAnalysisId,
            writingId: dto.writingId,
            userId,
          },
        });
        if (previous?.feedbackJson) {
          const prevData =
            (previous.feedbackJson as Record<string, unknown>).aiAnalytics ??
            previous.feedbackJson;
          const scores = ['structure', 'clarity', 'tone', 'coherence']
            .map(
              (key) =>
                (prevData as Record<string, { score?: number }>)[key]?.score,
            )
            .filter((s): s is number => typeof s === 'number');
          if (scores.length > 0) {
            previousScore =
              Math.round(
                (scores.reduce((sum, s) => sum + s, 0) / scores.length) * 10,
              ) / 10;
          }
        }
      }

      // Step 6: Create analysis record with AI feedback
      const analysis = new Analytics();
      analysis.userId = userId;
      analysis.writingId = dto.writingId;
      analysis.feedbackJson = {
        ...dto.feedbackJson,
        aiAnalytics: parsed,
        validationErrors: parseResult.errors,
        generatedAt: new Date().toISOString(),
        writingType,
        previousAnalysisId: dto.previousAnalysisId ?? null,
        revisionNumber: existingCount + 1,
        previousScore,
      };

      const savedAnalytics = await this.analysisRepository.save(analysis);

      // Step 7: Record token usage
      await this.tokenTrackerService.recordTokenUsage(
        userId,
        aiResponse.totalTokens,
        savedAnalytics.id,
      );

      this.logger.log(
        `AI analysis created successfully for writing ${writing.id}. Tokens used: ${aiResponse.totalTokens}`,
      );

      return {
        analysis: savedAnalytics,
        tokensUsed: aiResponse.totalTokens,
      };
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }

      // Handle Gemini errors
      const errorDetails = AiErrorHandler.handle(error);
      this.logger.error(
        `AI analysis generation failed for writing ${dto.writingId}: ${errorDetails.message}`,
      );

      throwAppError(ERROR_CODE.AI_ANALYSIS_FAILED);
    }
  }

  /**
   * Map writing type to AI analysis type
   */
  private mapWritingTypeToAnalyticsType(writingType: string): WritingType {
    const typeMap: { [key: string]: WritingType } = {
      'BÀI LUẬN XÃ HỘI': WritingType.SOCIAL_ESSAY,
      'BÀI LUẬN CÔNG GIÁO': WritingType.CATHOLIC_ESSAY,
      'TRUYỆN NGẮN': WritingType.SHORT_STORY,
      'BÀI BÁO': WritingType.ARTICLE,
    };

    return typeMap[writingType] || WritingType.SOCIAL_ESSAY;
  }

  /**
   * Get all analyses for a user with pagination and filtering
   */
  async findAll(userId: string, query: QueryAnalyticsDTO) {
    if (!userId) {
      throwAppError(ERROR_CODE.USER_ID_REQUIRED);
    }

    const { limit = 10, offset = 0, writingId } = query;

    const queryBuilder = this.analysisRepository
      .createQueryBuilder('analysis')
      .where('analysis.userId = :userId', { userId })
      .leftJoinAndSelect('analysis.writing', 'writing');

    if (writingId) {
      queryBuilder.andWhere('analysis.writingId = :writingId', { writingId });
    }

    queryBuilder.orderBy('analysis.createdAt', 'DESC').skip(offset).take(limit);

    const [analyses, total] = await queryBuilder.getManyAndCount();

    return {
      data: analyses,
      pagination: {
        limit,
        offset,
        total,
        hasMore: offset + limit < total,
      },
    };
  }

  /**
   * Get a single analysis by ID
   */
  async findOne(id: string, userId: string): Promise<Analytics> {
    if (!id) {
      throwAppError(ERROR_CODE.ANALYTICS_ID_REQUIRED);
    }

    if (!userId) {
      throwAppError(ERROR_CODE.USER_ID_REQUIRED);
    }

    const analysis = await this.analysisRepository.findOne({
      where: {
        id,
        userId,
      },
      relations: {
        writing: true,
        user: true,
      },
    });

    if (!analysis) {
      throwAppError(ERROR_CODE.ANALYTICS_NOT_FOUND);
    }

    return analysis;
  }

  /**
   * Get analyses for a specific writing
   */
  async findByWritingId(writingId: string, userId: string) {
    if (!writingId) {
      throwAppError(ERROR_CODE.WRITING_ID_REQUIRED);
    }

    if (!userId) {
      throwAppError(ERROR_CODE.USER_ID_REQUIRED);
    }

    // Verify writing exists and belongs to the user
    const writing = await this.writingRepository.findOne({
      where: {
        id: writingId,
        userId,
      },
    });

    if (!writing) {
      throwAppError(ERROR_CODE.WRITING_NOT_FOUND);
    }

    const analyses = await this.analysisRepository.find({
      where: {
        writingId,
        userId,
      },
      order: { createdAt: 'DESC' },
    });

    return {
      data: analyses,
      total: analyses.length,
      limit: 100,
      offset: 0,
    };
  }

  /**
   * Update an analysis
   */
  async update(
    id: string,
    userId: string,
    dto: UpdateAnalyticsDTO,
  ): Promise<Analytics> {
    if (!id) {
      throwAppError(ERROR_CODE.ANALYTICS_ID_REQUIRED);
    }

    if (!userId) {
      throwAppError(ERROR_CODE.USER_ID_REQUIRED);
    }

    const analysis = await this.findOne(id, userId);

    if (analysis.userId !== userId) {
      throwAppError(ERROR_CODE.ANALYTICS_ACCESS_DENIED);
    }

    const updatedAnalytics = this.analysisRepository.merge(analysis, {
      feedbackJson:
        dto.feedbackJson !== undefined
          ? dto.feedbackJson
          : analysis.feedbackJson,
    });

    return this.analysisRepository.save(updatedAnalytics);
  }

  /**
   * Delete an analysis
   */
  async remove(id: string, userId: string): Promise<{ message: string }> {
    if (!id) {
      throwAppError(ERROR_CODE.ANALYTICS_ID_REQUIRED);
    }

    if (!userId) {
      throwAppError(ERROR_CODE.USER_ID_REQUIRED);
    }

    const analysis = await this.findOne(id, userId);

    if (analysis.userId !== userId) {
      throwAppError(ERROR_CODE.ANALYTICS_ACCESS_DENIED);
    }

    await this.analysisRepository.remove(analysis);

    return {
      message: `Analytics with ID ${id} has been deleted successfully`,
    };
  }

  /**
   * Get analysis statistics for a user
   */
  async getStats(userId: string) {
    if (!userId) {
      throwAppError(ERROR_CODE.USER_ID_REQUIRED);
    }

    const totalAnalyses = await this.analysisRepository.count({
      where: { userId },
    });

    const analysesWithFeedback = await this.analysisRepository.count({
      where: [{ userId, feedbackJson: true }],
    });

    return {
      totalAnalyses,
      analysesWithFeedback,
      percentageWithFeedback:
        totalAnalyses > 0
          ? Math.round((analysesWithFeedback / totalAnalyses) * 100)
          : 0,
    };
  }

  /**
   * Learning progress: score history, criterion averages, writing streak
   */
  async getProgress(userId: string) {
    if (!userId) {
      throwAppError(ERROR_CODE.USER_ID_REQUIRED);
    }

    const analyses = await this.analysisRepository.find({
      where: { userId },
      order: { createdAt: 'ASC' },
      take: 30,
    });

    const scoreHistory = analyses
      .map((analysis) => ({
        id: analysis.id,
        writingId: analysis.writingId,
        date: analysis.createdAt.toISOString(),
        score: getOverallScore(analysis.feedbackJson),
      }))
      .filter(
        (item): item is typeof item & { score: number } => item.score != null,
      );

    const criterionAverages = computeCriterionAverages(analyses);
    const weakestCriterion = findWeakestCriterion(criterionAverages);

    const writings = await this.writingRepository.find({
      where: { userId },
      select: { createdAt: true, updatedAt: true },
    });

    const activityDates = writings.flatMap((writing) => [
      writing.createdAt,
      writing.updatedAt,
    ]);
    const writingStreak = computeWritingStreak(activityDates);

    const scores = scoreHistory.map((item) => item.score);
    const recentScores = scores.slice(-3);
    const earlyScores = scores.slice(0, 3);
    const averageRecent =
      recentScores.length > 0
        ? Math.round(
            (recentScores.reduce((sum, s) => sum + s, 0) / recentScores.length) *
              10,
          ) / 10
        : null;
    const averageEarly =
      earlyScores.length > 0
        ? Math.round(
            (earlyScores.reduce((sum, s) => sum + s, 0) / earlyScores.length) *
              10,
          ) / 10
        : null;

    return {
      scoreHistory,
      criterionAverages,
      weakestCriterion,
      writingStreak,
      totalGraded: scoreHistory.length,
      averageRecentScore: averageRecent,
      averageEarlyScore: averageEarly,
      scoreDelta:
        averageRecent != null && averageEarly != null
          ? Math.round((averageRecent - averageEarly) * 10) / 10
          : null,
    };
  }

  /**
   * Get analyses for multiple writings at once
   */
  async findByWritingIds(writingIds: string[], userId: string) {
    if (!writingIds || writingIds.length === 0) {
      throwAppError(ERROR_CODE.WRITING_IDS_REQUIRED);
    }

    if (!userId) {
      throwAppError(ERROR_CODE.USER_ID_REQUIRED);
    }

    const analyses = await this.analysisRepository
      .createQueryBuilder('analysis')
      .where('analysis.userId = :userId', { userId })
      .andWhere('analysis.writingId IN (:...writingIds)', { writingIds })
      .orderBy('analysis.createdAt', 'DESC')
      .getMany();

    return {
      writingIds,
      analyses,
      count: analyses.length,
    };
  }
}
