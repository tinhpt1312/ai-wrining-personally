import { Injectable, Logger } from '@nestjs/common';
import { ERROR_CODE } from 'src/constants';
import { throwAppError } from 'src/common/app.exception';
import { GeminiProvider } from 'src/shared/ai/providers/gemini.provider';
import { PromptTemplatesService } from 'src/shared/ai/services/prompt-templates.service';
import { TokenTrackerService } from 'src/modules/analytics/services/token-tracker.service';
import { extractJson } from 'src/utils/parse-json.helper';
import { Book } from 'src/entities';
import { RecommendBooksDTO } from '../dto';
import { BooksService } from './books.service';

export interface BookRecommendation {
  bookId: string;
  title: string;
  author: string;
  reason: string;
  relevanceScore: number;
  suggestedEssayPrompt: string;
  readingTimeMinutes?: number | null;
}

@Injectable()
export class BookRecommendationService {
  private readonly logger = new Logger(BookRecommendationService.name);

  constructor(
    private readonly booksService: BooksService,
    private readonly geminiProvider: GeminiProvider,
    private readonly promptTemplates: PromptTemplatesService,
    private readonly tokenTrackerService: TokenTrackerService,
  ) {}

  async recommend(
    userId: string,
    dto: RecommendBooksDTO,
  ): Promise<BookRecommendation[]> {
    if (!userId) {
      throwAppError(ERROR_CODE.USER_ID_REQUIRED);
    }

    const count = dto.count ?? 3;
    const catalog = await this.booksService.getCatalogForRecommendation(
      dto.writingType,
    );

    if (catalog.length === 0) {
      throwAppError(ERROR_CODE.BOOK_CATALOG_EMPTY);
    }

    const prompt = this.promptTemplates.getBookRecommendationPrompt({
      writingType: dto.writingType,
      topic: dto.topic,
      draftExcerpt: dto.draftExcerpt,
      count,
      catalog,
    });

    const response = await this.geminiProvider.generateAnalytics({
      prompt,
      systemPrompt:
        'Bạn là thủ thư và giáo viên dạy viết văn tiếng Việt. Luôn trả về JSON hợp lệ, không markdown. Chỉ gợi ý sách có trong danh mục được cung cấp.',
      temperature: 0.7,
      maxTokens: 2048,
      jsonMode: true,
    });

    await this.tokenTrackerService.recordTokenUsage(
      userId,
      response.totalTokens,
    );

    const recommendations = this.parseRecommendations(
      response.text,
      catalog,
      count,
    );

    this.logger.log(
      `Generated ${recommendations.length} book recommendations for type "${dto.writingType}", tokens: ${response.totalTokens}`,
    );

    return recommendations;
  }

  private parseRecommendations(
    text: string,
    catalog: Book[],
    maxCount: number,
  ): BookRecommendation[] {
    try {
      const json = extractJson(text);
      const parsed = JSON.parse(json) as Record<string, unknown>;
      const rawItems = parsed.recommendations;

      if (!Array.isArray(rawItems) || rawItems.length === 0) {
        throw new Error('Missing recommendations array');
      }

      const catalogById = new Map(catalog.map((book) => [book.id, book]));

      const recommendations = rawItems
        .map((item) => {
          const record = item as Record<string, unknown>;
          const bookId =
            typeof record.bookId === 'string' ? record.bookId.trim() : '';
          const book = catalogById.get(bookId);

          if (!book) {
            return null;
          }

          const reason =
            typeof record.reason === 'string' ? record.reason.trim() : '';
          const suggestedEssayPrompt =
            typeof record.suggestedEssayPrompt === 'string'
              ? record.suggestedEssayPrompt.trim()
              : '';
          const relevanceScore =
            typeof record.relevanceScore === 'number'
              ? Math.min(10, Math.max(1, record.relevanceScore))
              : 7;

          if (!reason || !suggestedEssayPrompt) {
            return null;
          }

          return {
            bookId: book.id,
            title: book.title,
            author: book.author,
            reason,
            relevanceScore,
            suggestedEssayPrompt,
            readingTimeMinutes: book.readingTimeMinutes ?? undefined,
          } as BookRecommendation;
        })
        .filter((item): item is BookRecommendation => item != null)
        .slice(0, maxCount);

      if (recommendations.length === 0) {
        throw new Error('No valid recommendations');
      }

      return recommendations;
    } catch (error) {
      this.logger.warn('Failed to parse book recommendations JSON', error);
      throwAppError(ERROR_CODE.BOOK_RECOMMENDATION_FAILED);
    }
  }
}
