import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';
import { ERROR_CODE, ERROR_MESSAGES } from 'src/constants';
import { ENV } from 'src/config/env.config';
import { AiError, AiErrorCode } from '../../../utils/ai-error-handler';
import { parseSuggestionsPayload } from 'src/utils/parse-json.helper';
import type {
  AiProviderRequest,
  AiProviderResponse,
} from './ai-provider.types';
import {
  isRawWritingSuggestion,
  type RawWritingSuggestion,
} from '../../../types/suggestion.types';

export type { AiProviderRequest, AiProviderResponse };

@Injectable()
export class GeminiProvider {
  private readonly logger = new Logger(GeminiProvider.name);
  private readonly modelChain: string[];
  private readonly client: GoogleGenAI;

  constructor() {
    this.client = new GoogleGenAI({ apiKey: ENV.GEMINI.API_KEY });
    this.modelChain = [
      ENV.GEMINI.MODEL,
      ...ENV.GEMINI.FALLBACK_MODELS.filter(
        (model) => model !== ENV.GEMINI.MODEL,
      ),
    ];
    this.logger.log(
      `Gemini Interactions API ready — models: ${this.modelChain.join(' → ')}`,
    );
  }

  async generateAnalytics(
    request: AiProviderRequest,
  ): Promise<AiProviderResponse> {
    let lastError: unknown;

    for (const model of this.modelChain) {
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const response = await this.callGemini(model, request);

          if (model !== this.modelChain[0]) {
            this.logger.warn(`Đang dùng model dự phòng: ${model}`);
          }

          return response;
        } catch (error) {
          lastError = error;

          if (error instanceof AiError && !error.retryable) {
            throw error;
          }

          const rateLimit = this.parseRateLimit(error);
          const notFound = this.parseNotFound(error);

          if (notFound) {
            this.logger.warn(
              `Model ${model} không khả dụng, chuyển model tiếp theo`,
            );
            break;
          }

          if (rateLimit.isRateLimit && attempt < 3) {
            const delayMs = Math.ceil((rateLimit.retryAfterSec ?? 5) * 1000);
            this.logger.warn(
              `Model ${model} hết quota (lần ${attempt}/3), thử lại sau ${delayMs}ms`,
            );
            await this.sleep(delayMs);
            continue;
          }

          if (rateLimit.isRateLimit) {
            this.logger.warn(
              `Model ${model} hết quota, chuyển sang model tiếp theo`,
            );
            break;
          }

          this.logger.error('Gemini API error:', error);
          throw this.mapGeminiError(error);
        }
      }
    }

    this.logger.error('Gemini API error (all models exhausted):', lastError);
    throw this.mapGeminiError(lastError);
  }

  async checkConnectivity(): Promise<boolean> {
    try {
      const response = await this.callGemini(this.modelChain[0], {
        prompt: 'ping',
        temperature: 0.1,
        maxTokens: 16,
      });
      return !!response.text;
    } catch (error) {
      const err = error as { message?: string };
      this.logger.warn(
        'Gemini connectivity check failed:',
        err?.message || 'Unknown error',
      );
      return false;
    }
  }

  async generateWritingSuggestions(
    text: string,
    focusAreas: string[] = [],
  ): Promise<
    Array<{
      type: string;
      originalText: string;
      suggestedText: string;
      explanation: string;
      confidenceScore: number;
      severity: string;
      position?: { start: number; end: number };
    }>
  > {
    const focusAreasString =
      focusAreas.length > 0
        ? `Tập trung vào: ${focusAreas.join(', ')}.`
        : 'Tìm mọi loại cải thiện có thể.';

    const inputText = text.substring(0, 1500);
    const maxSuggestions = 6;
    const maxTokens = Math.min(ENV.GEMINI.MAX_OUTPUT_TOKENS ?? 4096, 3000);

    const prompt = `Phân tích đoạn văn tiếng Việt sau và đưa ra tối đa ${maxSuggestions} gợi ý sửa cụ thể.
${focusAreasString}

Văn bản:
"""
${inputText}
"""

Trả về JSON object với đúng format sau (không thêm text nào khác):
{
  "suggestions": [
    {
      "type": "grammar|vocabulary|punctuation|style|clarity|tone",
      "originalText": "cụm từ gốc trong bài",
      "suggestedText": "cụm từ đã sửa",
      "explanation": "lý do sửa",
      "confidenceScore": 0.5,
      "severity": "error|warning|suggestion|info"
    }
  ]
}

Quy tắc:
- Chỉ trả về JSON hợp lệ.
- Tối đa ${maxSuggestions} gợi ý, ưu tiên gợi ý quan trọng nhất.
- originalText phải là đoạn ngắn có thật trong văn bản.
- Giữ explanation ngắn gọn (dưới 120 ký tự).`;

    const systemPrompt =
      'Bạn là trợ lý sửa văn tiếng Việt. Luôn trả về JSON hợp lệ, không markdown, không giải thích thêm.';

    const maxAttempts = 3;
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await this.generateAnalytics({
          prompt,
          systemPrompt,
          temperature: attempt === 1 ? 0.4 : 0.2,
          maxTokens,
          jsonMode: true,
        });

        const parsed = parseSuggestionsPayload(response.text);
        const suggestions = parsed.slice(0, maxSuggestions);

        if (suggestions.length === 0) {
          throw new Error('Model returned an empty suggestions array');
        }

        return suggestions
          .filter(isRawWritingSuggestion)
          .map((s: RawWritingSuggestion) => ({
            type: s.type || 'suggestion',
            originalText: s.originalText || '',
            suggestedText: s.suggestedText || '',
            explanation: s.explanation || '',
            confidenceScore:
              typeof s.confidenceScore === 'number' ? s.confidenceScore : 0.7,
            severity: s.severity || 'suggestion',
          }));
      } catch (error) {
        lastError = error;

        if (
          error instanceof AiError &&
          error.code === AiErrorCode.RATE_LIMITED
        ) {
          throw error;
        }

        this.logger.warn(
          `Suggestion parse attempt ${attempt}/${maxAttempts} failed: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );

        if (attempt < maxAttempts) {
          await this.sleep(attempt * 800);
        }
      }
    }

    this.logger.error('Failed to generate suggestions:', lastError);
    throw new AiError(
      AiErrorCode.API_ERROR,
      ERROR_MESSAGES[ERROR_CODE.AI_SUGGESTION_GENERATION_FAILED],
      true,
    );
  }

  private async callGemini(
    model: string,
    request: AiProviderRequest,
  ): Promise<AiProviderResponse> {
    const interaction = await this.client.interactions.create({
      model,
      input: request.prompt,
      system_instruction: request.systemPrompt,
      generation_config: {
        temperature: request.temperature ?? ENV.GEMINI.TEMPERATURE,
        max_output_tokens:
          request.maxTokens ?? ENV.GEMINI.MAX_OUTPUT_TOKENS ?? 4096,
      },
      ...(request.jsonMode
        ? {
            response_format: {
              type: 'text' as const,
              mime_type: 'application/json' as const,
            },
          }
        : {}),
    });

    const text = interaction.output_text;

    if (!text?.trim()) {
      throw new AiError(
        AiErrorCode.INVALID_RESPONSE,
        ERROR_MESSAGES[ERROR_CODE.GEMINI_EMPTY_RESPONSE],
      );
    }

    if (interaction.status === 'incomplete') {
      this.logger.warn(`Gemini response incomplete on ${model}`);
    }

    const inputTokens = interaction.usage?.total_input_tokens ?? 0;
    const outputTokens = interaction.usage?.total_output_tokens ?? 0;

    this.logger.debug(
      `Gemini [${model}]: ${inputTokens} in / ${outputTokens} out, status=${interaction.status}`,
    );

    return {
      text,
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
      finishReason: interaction.status,
    };
  }

  private parseRateLimit(error: unknown): {
    isRateLimit: boolean;
    retryAfterSec?: number;
  } {
    const err = error as { status?: number; message?: string };
    const message = err?.message || '';
    const isRateLimit =
      err?.status === 429 ||
      message.includes('429') ||
      message.includes('RESOURCE_EXHAUSTED') ||
      message.toLowerCase().includes('quota');

    if (!isRateLimit) {
      return { isRateLimit: false };
    }

    const retryMatch = message.match(/retry in ([\d.]+)s/i);
    const retryAfterSec = retryMatch ? Number(retryMatch[1]) : undefined;

    return { isRateLimit: true, retryAfterSec };
  }

  private parseNotFound(error: unknown): boolean {
    const err = error as { status?: number; message?: string };
    const message = (err?.message || '').toLowerCase();
    return (
      err?.status === 404 ||
      message.includes('not_found') ||
      message.includes('not found') ||
      message.includes('is not found')
    );
  }

  private mapGeminiError(error: unknown): AiError {
    const err = error as { message?: string; status?: number };
    const message = err?.message || 'Unknown error';
    const rateLimit = this.parseRateLimit(error);

    if (rateLimit.isRateLimit) {
      return new AiError(
        AiErrorCode.RATE_LIMITED,
        ERROR_MESSAGES[ERROR_CODE.GEMINI_RATE_LIMITED],
        true,
        Math.ceil(rateLimit.retryAfterSec ?? 60),
      );
    }

    if (this.parseNotFound(error)) {
      return new AiError(
        AiErrorCode.API_ERROR,
        ERROR_MESSAGES[ERROR_CODE.GEMINI_MODEL_NOT_FOUND],
        false,
      );
    }

    if (
      err?.status === 401 ||
      err?.status === 403 ||
      message.includes('API key') ||
      message.includes('API_KEY_INVALID')
    ) {
      return new AiError(
        AiErrorCode.API_ERROR,
        ERROR_MESSAGES[ERROR_CODE.GEMINI_API_KEY_INVALID],
        false,
      );
    }

    if (err?.status === 503 || message.includes('503')) {
      return new AiError(
        AiErrorCode.SERVICE_UNAVAILABLE,
        ERROR_MESSAGES[ERROR_CODE.GEMINI_SERVICE_UNAVAILABLE],
        true,
        30,
      );
    }

    return new AiError(
      `Gemini API error: ${message}`,
      AiErrorCode.API_ERROR,
      true,
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
