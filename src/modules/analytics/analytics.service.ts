import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Analytics, Writing } from 'src/entities';
import { Repository } from 'typeorm';
import {
  CreateAnalyticsDTO,
  QueryAnalyticsDTO,
  UpdateAnalyticsDTO,
  CreateAiAnalyticsDTO,
} from './dto';
import { GeminiProvider } from '../ai/providers/gemini.provider';
import { PromptTemplatesService } from '../ai/services/prompt-templates.service';
import { ResponseParserService } from './services/response-parser.service';
import { TokenTrackerService } from './services/token-tracker.service';
import { TokenEstimator } from '../ai/utils/token-estimator';
import { AiErrorHandler } from '../ai/utils/ai-error-handler';
import { WritingType } from '../ai/types/ai.types';

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
      throw new BadRequestException('User ID is required');
    }

    if (!dto.writingId) {
      throw new BadRequestException('Writing ID is required');
    }

    // Verify writing exists and belongs to the user
    const writing = await this.writingRepository.findOne({
      where: {
        id: dto.writingId,
        userId,
      },
    });

    if (!writing) {
      throw new NotFoundException(
        `Writing with ID ${dto.writingId} not found or you do not have access to it`,
      );
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
  ): Promise<{ analysis: Analytics; tokensUsed: number; error?: any }> {
    if (!userId) {
      throw new BadRequestException('User ID is required');
    }

    if (!dto.writingId) {
      throw new BadRequestException('Writing ID is required');
    }

    // Verify writing exists and belongs to the user
    const writing = await this.writingRepository.findOne({
      where: {
        id: dto.writingId,
        userId,
      },
    });

    if (!writing) {
      throw new NotFoundException(
        `Writing with ID ${dto.writingId} not found or you do not have access to it`,
      );
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
        const usage = await this.tokenTrackerService.getCurrentDayUsage(userId);
        throw new HttpException(
          {
            message: 'Daily token limit exceeded',
            data: {
              tokensUsed: usage.used,
              tokensLimit: usage.limit,
              remaining: usage.remaining,
            },
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
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

        throw new HttpException(
          {
            message: 'AI analysis generation failed due to invalid AI response',
            errors,
            rawContent: parseResult.rawContent,
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      const parsed = parseResult.data;

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
      if (error instanceof HttpException) {
        throw error;
      }

      // Handle Gemini errors
      const errorDetails = AiErrorHandler.handle(error);
      const httpStatus =
        errorDetails.statusCode === 429
          ? HttpStatus.TOO_MANY_REQUESTS
          : errorDetails.statusCode && errorDetails.statusCode >= 500
            ? HttpStatus.SERVICE_UNAVAILABLE
            : HttpStatus.BAD_REQUEST;

      throw new HttpException(
        {
          message: 'AI analysis generation failed',
          error: errorDetails,
          retryable: errorDetails.retryable,
          retryAfter: errorDetails.retryAfter,
        },
        httpStatus,
      );
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

    return typeMap[writingType] || WritingType.ARTICLE;
  }

  /**
   * Get all analyses for a user with pagination and filtering
   */
  async findAll(userId: string, query: QueryAnalyticsDTO) {
    if (!userId) {
      throw new BadRequestException('User ID is required');
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
      throw new BadRequestException('Analytics ID is required');
    }

    if (!userId) {
      throw new BadRequestException('User ID is required');
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
      throw new NotFoundException(
        `Analytics with ID ${id} not found or you do not have access to it`,
      );
    }

    return analysis;
  }

  /**
   * Get analyses for a specific writing
   */
  async findByWritingId(writingId: string, userId: string) {
    if (!writingId) {
      throw new BadRequestException('Writing ID is required');
    }

    if (!userId) {
      throw new BadRequestException('User ID is required');
    }

    // Verify writing exists and belongs to the user
    const writing = await this.writingRepository.findOne({
      where: {
        id: writingId,
        userId,
      },
    });

    if (!writing) {
      throw new NotFoundException(
        `Writing with ID ${writingId} not found or you do not have access to it`,
      );
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
      throw new BadRequestException('Analytics ID is required');
    }

    if (!userId) {
      throw new BadRequestException('User ID is required');
    }

    const analysis = await this.findOne(id, userId);

    if (analysis.userId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to update this analysis',
      );
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
      throw new BadRequestException('Analytics ID is required');
    }

    if (!userId) {
      throw new BadRequestException('User ID is required');
    }

    const analysis = await this.findOne(id, userId);

    if (analysis.userId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to delete this analysis',
      );
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
      throw new BadRequestException('User ID is required');
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
   * Get analyses for multiple writings at once
   */
  async findByWritingIds(writingIds: string[], userId: string) {
    if (!writingIds || writingIds.length === 0) {
      throw new BadRequestException('Writing IDs are required');
    }

    if (!userId) {
      throw new BadRequestException('User ID is required');
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
