import { Injectable, Logger } from '@nestjs/common';
import { ERROR_CODE } from 'src/constants';
import { throwAppError } from 'src/common/app.exception';
import { GeminiProvider } from 'src/shared/ai/providers/gemini.provider';
import { PromptTemplatesService } from 'src/shared/ai/services/prompt-templates.service';
import { TokenTrackerService } from 'src/modules/analytics/services/token-tracker.service';
import { extractJson } from 'src/utils/parse-json.helper';
import { GenerateOutlineDTO } from '../dto/generate-outline.dto';

export interface WritingOutlineSection {
  id: string;
  label: string;
  keyPoints: string[];
  hint?: string;
}

export interface WritingOutline {
  title: string;
  sections: WritingOutlineSection[];
}

@Injectable()
export class WritingOutlineService {
  private readonly logger = new Logger(WritingOutlineService.name);

  constructor(
    private readonly geminiProvider: GeminiProvider,
    private readonly promptTemplates: PromptTemplatesService,
    private readonly tokenTrackerService: TokenTrackerService,
  ) {}

  async generate(userId: string, dto: GenerateOutlineDTO): Promise<WritingOutline> {
    if (!userId) {
      throwAppError(ERROR_CODE.USER_ID_REQUIRED);
    }

    const prompt = this.promptTemplates.getOutlinePrompt(
      dto.title,
      dto.type,
      dto.topic,
    );

    const response = await this.geminiProvider.generateAnalytics({
      prompt,
      systemPrompt:
        'Bạn là giáo viên dạy viết văn tiếng Việt. Luôn trả về JSON hợp lệ, không markdown.',
      temperature: 0.5,
      maxTokens: 2048,
      jsonMode: true,
    });

    await this.tokenTrackerService.recordTokenUsage(
      userId,
      response.totalTokens,
    );

    const outline = this.parseOutline(response.text, dto.title);
    this.logger.log(
      `Outline generated for "${dto.title}" — ${outline.sections.length} sections, tokens: ${response.totalTokens}`,
    );

    return outline;
  }

  private parseOutline(text: string, fallbackTitle: string): WritingOutline {
    try {
      const json = extractJson(text);
      const parsed = JSON.parse(json) as Record<string, unknown>;
      const sectionsRaw = parsed.sections;

      if (!Array.isArray(sectionsRaw) || sectionsRaw.length === 0) {
        throw new Error('Missing sections array');
      }

      const sections = sectionsRaw
        .map((section, index) => {
          const item = section as Record<string, unknown>;
          const label =
            typeof item.label === 'string' ? item.label.trim() : '';
          const keyPoints = Array.isArray(item.keyPoints)
            ? item.keyPoints
                .filter((point): point is string => typeof point === 'string')
                .map((point) => point.trim())
                .filter(Boolean)
            : [];

          if (!label || keyPoints.length === 0) {
            return null;
          }

          const parsed: WritingOutlineSection = {
            id:
              typeof item.id === 'string' && item.id.trim()
                ? item.id.trim()
                : `section-${index + 1}`,
            label,
            keyPoints,
          };

          if (typeof item.hint === 'string' && item.hint.trim()) {
            parsed.hint = item.hint.trim();
          }

          return parsed;
        })
        .filter((section): section is WritingOutlineSection => section != null);

      if (sections.length === 0) {
        throw new Error('No valid sections');
      }

      return {
        title:
          typeof parsed.title === 'string' && parsed.title.trim()
            ? parsed.title.trim()
            : fallbackTitle,
        sections,
      };
    } catch (error) {
      this.logger.warn('Failed to parse outline JSON', error);
      throwAppError(ERROR_CODE.OUTLINE_GENERATION_FAILED);
    }
  }
}
