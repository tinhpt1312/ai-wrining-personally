import { Injectable, Logger } from '@nestjs/common';
import { ERROR_CODE } from 'src/constants';
import { throwAppError } from 'src/common/app.exception';
import { GeminiProvider } from 'src/shared/ai/providers/gemini.provider';
import { PromptTemplatesService } from 'src/shared/ai/services/prompt-templates.service';
import { TokenTrackerService } from 'src/modules/analytics/services/token-tracker.service';
import { extractJson } from 'src/utils/parse-json.helper';
import {
  GenerateWritingPromptsDTO,
  PromptDifficulty,
} from '../dto/generate-writing-prompts.dto';

export interface GeneratedWritingPrompt {
  title: string;
  topic: string;
  hint: string;
  difficulty: PromptDifficulty;
}

@Injectable()
export class WritingPromptService {
  private readonly logger = new Logger(WritingPromptService.name);

  constructor(
    private readonly geminiProvider: GeminiProvider,
    private readonly promptTemplates: PromptTemplatesService,
    private readonly tokenTrackerService: TokenTrackerService,
  ) {}

  async generate(
    userId: string,
    dto: GenerateWritingPromptsDTO,
  ): Promise<GeneratedWritingPrompt[]> {
    if (!userId) {
      throwAppError(ERROR_CODE.USER_ID_REQUIRED);
    }

    const count = dto.count ?? 4;
    const prompt = this.promptTemplates.getWritingPromptsPrompt(
      dto.type,
      dto.difficulty,
      count,
      dto.excludeTitles,
    );

    const response = await this.geminiProvider.generateAnalytics({
      prompt,
      systemPrompt:
        'Bạn là giáo viên dạy viết văn tiếng Việt. Luôn trả về JSON hợp lệ, không markdown.',
      temperature: 0.8,
      maxTokens: 2048,
      jsonMode: true,
    });

    await this.tokenTrackerService.recordTokenUsage(
      userId,
      response.totalTokens,
    );

    const prompts = this.parsePrompts(response.text, dto.difficulty);
    this.logger.log(
      `Generated ${prompts.length} writing prompts for type "${dto.type}", tokens: ${response.totalTokens}`,
    );

    return prompts;
  }

  private parsePrompts(
    text: string,
    fallbackDifficulty?: PromptDifficulty,
  ): GeneratedWritingPrompt[] {
    try {
      const json = extractJson(text);
      const parsed = JSON.parse(json) as Record<string, unknown>;
      const promptsRaw = parsed.prompts;

      if (!Array.isArray(promptsRaw) || promptsRaw.length === 0) {
        throw new Error('Missing prompts array');
      }

      const prompts = promptsRaw
        .map((item) => {
          const record = item as Record<string, unknown>;
          const title =
            typeof record.title === 'string' ? record.title.trim() : '';
          const topic =
            typeof record.topic === 'string' ? record.topic.trim() : title;
          const hint =
            typeof record.hint === 'string' ? record.hint.trim() : '';
          const difficulty = this.parseDifficulty(
            record.difficulty,
            fallbackDifficulty,
          );

          if (!title || !hint) {
            return null;
          }

          return {
            title,
            topic: topic || title,
            hint,
            difficulty,
          } satisfies GeneratedWritingPrompt;
        })
        .filter((prompt): prompt is GeneratedWritingPrompt => prompt != null);

      if (prompts.length === 0) {
        throw new Error('No valid prompts');
      }

      return prompts;
    } catch (error) {
      this.logger.warn('Failed to parse writing prompts JSON', error);
      throwAppError(ERROR_CODE.PROMPT_GENERATION_FAILED);
    }
  }

  private parseDifficulty(
    value: unknown,
    fallback?: PromptDifficulty,
  ): PromptDifficulty {
    if (
      value === 'dễ' ||
      value === 'trung bình' ||
      value === 'khó'
    ) {
      return value;
    }
    return fallback ?? 'trung bình';
  }
}
