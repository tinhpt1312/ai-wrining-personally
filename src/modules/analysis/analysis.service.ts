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
import { Analysis, Writing } from 'src/entities';
import { Repository } from 'typeorm';
import {
  CreateAnalysisDTO,
  QueryAnalysisDTO,
  UpdateAnalysisDTO,
  CreateAiAnalysisDTO,
} from './dto';
import { OpenAiProvider } from '../ai/providers/openai.provider';
import { PromptTemplatesService } from '../ai/services/prompt-templates.service';
import { ResponseParserService } from './services/response-parser.service';
import { TokenTrackerService } from './services/token-tracker.service';
import { TokenEstimator } from '../ai/utils/token-estimator';
import { AiErrorHandler } from '../ai/utils/ai-error-handler';
import { WritingType } from '../ai/types/ai.types';
import { extractJson } from 'src/shared';

@Injectable()
export class AnalysisService {
  private readonly logger = new Logger(AnalysisService.name);

  constructor(
    @InjectRepository(Analysis)
    private readonly analysisRepository: Repository<Analysis>,
    @InjectRepository(Writing)
    private readonly writingRepository: Repository<Writing>,
    private readonly openAiProvider: OpenAiProvider,
    private readonly promptTemplatesService: PromptTemplatesService,
    private readonly responseParserService: ResponseParserService,
    private readonly tokenTrackerService: TokenTrackerService,
  ) {}

  /**
   * Create a new analysis for a writing
   */
  async create(userId: string, dto: CreateAnalysisDTO): Promise<Analysis> {
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

    const analysis = new Analysis();
    analysis.userId = userId;
    analysis.writingId = dto.writingId;
    analysis.feedbackJson = dto.feedbackJson;

    return this.analysisRepository.save(analysis);
  }

  /**
   * Create analysis with AI-generated feedback
   * Handles token budget checks, AI generation, response parsing, and token tracking
   */
  async createWithAiAnalysis(
    userId: string,
    dto: CreateAiAnalysisDTO,
  ): Promise<{ analysis: Analysis; tokensUsed: number; error?: any }> {
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
        this.mapWritingTypeToAnalysisType(writing.type);

      // Step 2: Generate prompt
      const prompt = this.promptTemplatesService.getPrompt(
        writing,
        writingType,
      );

      const estimatedTokens = TokenEstimator.estimateTotalTokens(prompt, 500);

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

      // Step 4: Call OpenAI API
      this.logger.debug(`Calling OpenAI API for writing ${writing.id}`);
      const aiResponse = await this.openAiProvider.generateAnalysis({
        prompt,
      });

      // Step 5: Parse and validate response
      const parseResult = this.responseParserService.parseAndValidate(
        aiResponse.text,
      );

      if (!parseResult.valid) {
        this.logger.warn(
          `Response validation failed for writing ${writing.id}: ${parseResult.errors?.join(', ')}`,
        );
      }

      const jsonText = extractJson(parseResult.rawContent);

      const parsed = JSON.parse(jsonText);

      // Step 6: Create analysis record with AI feedback
      const analysis = new Analysis();
      analysis.userId = userId;
      analysis.writingId = dto.writingId;
      analysis.feedbackJson = {
        ...dto.feedbackJson,
        aiAnalysis: parsed || null,
        validationErrors: parseResult.errors,
        generatedAt: new Date().toISOString(),
        writingType,
      };

      const savedAnalysis = await this.analysisRepository.save(analysis);

      // Step 7: Record token usage
      await this.tokenTrackerService.recordTokenUsage(
        userId,
        aiResponse.totalTokens,
        savedAnalysis.id,
      );

      this.logger.log(
        `AI analysis created successfully for writing ${writing.id}. Tokens used: ${aiResponse.totalTokens}`,
      );

      return {
        analysis: savedAnalysis,
        tokensUsed: aiResponse.totalTokens,
      };
    } catch (error) {
      this.logger.error(`Error creating AI analysis: ${error.message}`, error);

      if (error instanceof HttpException) {
        throw error;
      }

      // Handle OpenAI errors
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
  private mapWritingTypeToAnalysisType(writingType: string): WritingType {
    const typeMap: { [key: string]: WritingType } = {
      journal: WritingType.JOURNAL_ENTRY,
      social_essay: WritingType.SOCIAL_ESSAY,
      blog_post: WritingType.SOCIAL_ESSAY,
      short_story: WritingType.REFLECTION_PIECE,
      article: WritingType.SOCIAL_ESSAY,
    };

    return typeMap[writingType] || WritingType.JOURNAL_ENTRY;
  }

  /**
   * Get all analyses for a user with pagination and filtering
   */
  async findAll(userId: string, query: QueryAnalysisDTO) {
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
  async findOne(id: string, userId: string): Promise<Analysis> {
    if (!id) {
      throw new BadRequestException('Analysis ID is required');
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
        `Analysis with ID ${id} not found or you do not have access to it`,
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
      writingId,
      title: writing.title,
      analyses,
      count: analyses.length,
    };
  }

  /**
   * Update an analysis
   */
  async update(
    id: string,
    userId: string,
    dto: UpdateAnalysisDTO,
  ): Promise<Analysis> {
    if (!id) {
      throw new BadRequestException('Analysis ID is required');
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

    const updatedAnalysis = this.analysisRepository.merge(analysis, {
      feedbackJson:
        dto.feedbackJson !== undefined
          ? dto.feedbackJson
          : analysis.feedbackJson,
    });

    return this.analysisRepository.save(updatedAnalysis);
  }

  /**
   * Delete an analysis
   */
  async remove(id: string, userId: string): Promise<{ message: string }> {
    if (!id) {
      throw new BadRequestException('Analysis ID is required');
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
      message: `Analysis with ID ${id} has been deleted successfully`,
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
