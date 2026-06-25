import { Injectable, Logger } from '@nestjs/common';

import { z } from 'zod';
import {
  PartialWritingAnalyticsSchema,
  ResponseParserResult,
  WritingAnalytics,
  WritingAnalyticsSchema,
  type PartialWritingAnalytics,
} from '../../ai/schemas/analysis-response.schema';

interface RawFeedbackItem {
  score?: number;
  feedback?: string;
  suggestions?: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asRawFeedbackItem(value: unknown): RawFeedbackItem | undefined {
  return isRecord(value) ? value : undefined;
}

@Injectable()
export class ResponseParserService {
  private readonly logger = new Logger(ResponseParserService.name);

  /**
   * Parse and validate OpenAI response
   * Handles JSON extraction from markdown code blocks and text
   */
  parseAndValidate(content: string): ResponseParserResult {
    try {
      // Step 1: Extract JSON from content
      const jsonContent = this.extractJson(content);
      if (!jsonContent) {
        this.logger.warn('No valid JSON found in response');
        return {
          valid: false,
          errors: ['No valid JSON found in response'],
          rawContent: content,
        };
      }

      // Step 2: Parse JSON
      let parsedData: unknown;
      try {
        parsedData = JSON.parse(jsonContent) as unknown;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown JSON parse error';
        this.logger.error('Failed to parse JSON:', error);
        return {
          valid: false,
          errors: [`JSON parse error: ${message}`],
          rawContent: content,
        };
      }

      // Step 3: Normalize common model omissions before schema validation.
      // Some models return one valid item for summary arrays even when prompted
      // for 2-3 items. Preserve useful feedback and fill the minimum shape.
      const normalizedData = this.normalizeAnalyticsData(parsedData);

      // Step 4: Validate against schema
      const validationResult = WritingAnalyticsSchema.safeParse(normalizedData);

      if (validationResult.success) {
        this.logger.debug('Response validation successful');
        return {
          valid: true,
          data: validationResult.data,
          rawContent: content,
        };
      }

      // Step 5: Try partial validation as fallback
      const partialResult =
        PartialWritingAnalyticsSchema.safeParse(normalizedData);

      if (partialResult.success && this.hasMinimalData(partialResult.data)) {
        this.logger.warn('Partial response validation successful (fallback)');
        return {
          valid: true,
          data: this.fillPartialData(partialResult.data),
          errors: this.formatZodErrors(validationResult.error),
          rawContent: content,
        };
      }

      // Full validation failed
      this.logger.error('Response validation failed:', validationResult.error);
      return {
        valid: false,
        errors: this.formatZodErrors(validationResult.error),
        rawContent: content,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown parsing error';
      this.logger.error('Unexpected error during parsing:', error);
      return {
        valid: false,
        errors: [`Unexpected parsing error: ${message}`],
        rawContent: content,
      };
    }
  }

  /**
   * Extract JSON from various formats
   * Handles: raw JSON, markdown code blocks, nested objects
   */
  private extractJson(content: string): string | null {
    if (!content || typeof content !== 'string') {
      return null;
    }

    // Try to extract from markdown code block (```json ... ```)
    const jsonCodeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonCodeBlockMatch?.[1]) {
      return jsonCodeBlockMatch[1].trim();
    }

    // Try to robustly extract the first balanced JSON object from the text.
    // This handles nested objects, strings with escaped quotes, and ignores
    // braces that appear inside string literals.
    const firstBraceIndex = content.indexOf('{');
    if (firstBraceIndex === -1) return null;

    for (
      let start = firstBraceIndex;
      start < content.length;
      start = content.indexOf('{', start + 1)
    ) {
      if (start === -1) break;
      let depth = 0;
      let inString = false;
      let escape = false;
      for (let i = start; i < content.length; i++) {
        const ch = content[i];

        if (escape) {
          escape = false;
          continue;
        }

        if (ch === '\\') {
          escape = true;
          continue;
        }

        if (ch === '"') {
          inString = !inString;
          continue;
        }

        if (inString) continue;

        if (ch === '{') depth++;
        else if (ch === '}') depth--;

        if (depth === 0) {
          const candidate = content.slice(start, i + 1).trim();
          // quick sanity: must start with { and end with }
          if (candidate.startsWith('{') && candidate.endsWith('}'))
            return candidate;
          break;
        }
      }

      // move to next opening brace if any
      if (start + 1 >= content.length) break;
    }

    return null;
  }

  /**
   * Check if partial data has minimum required fields
   */
  private hasMinimalData(data: unknown): boolean {
    if (!isRecord(data)) {
      return false;
    }

    return !!(
      data.structure ||
      data.clarity ||
      data.tone ||
      data.coherence ||
      data.overallFeedback
    );
  }

  /**
   * Fill partial data with defaults
   */
  private fillPartialData(partial: PartialWritingAnalytics): WritingAnalytics {
    const defaultFeedback = {
      score: 5,
      feedback: 'Đang phân tích chi tiết',
      suggestions: ['Vui lòng xem lại phản hồi đã cung cấp'],
    };

    return {
      structure: partial.structure || defaultFeedback,
      clarity: partial.clarity || defaultFeedback,
      tone: partial.tone || defaultFeedback,
      coherence: partial.coherence || defaultFeedback,
      overallFeedback:
        partial.overallFeedback ||
        'Tổng quan: Bài viết có tiềm năng cải thiện ở nhiều khía cạnh.',
      strengths: partial.strengths || [
        'Ý tưởng rõ ràng',
        'Giọng văn chân thật',
        'Nội dung hấp dẫn',
      ],
      areasForImprovement: partial.areasForImprovement || [
        'Cấu trúc bài viết',
        'Mạch lạc và liên kết',
        'Ví dụ minh họa',
      ],
      actionItems: partial.actionItems || [
        'Đọc kỹ phản hồi',
        'Luyện viết thường xuyên',
        'Nhờ người khác góp ý thêm',
      ],
      sampleWriting: partial.sampleWriting,
    };
  }

  private normalizeAnalyticsData(data: unknown): Record<string, unknown> {
    if (!isRecord(data)) {
      return {};
    }

    const normalized: Record<string, unknown> = { ...data };

    normalized.structure = this.normalizeFeedbackItem(
      normalized.structure,
      'Phản hồi về bố cục đang được hoàn thiện.',
    );
    normalized.clarity = this.normalizeFeedbackItem(
      normalized.clarity,
      'Phản hồi về độ rõ ràng đang được hoàn thiện.',
    );
    normalized.tone = this.normalizeFeedbackItem(
      normalized.tone,
      'Phản hồi về giọng văn đang được hoàn thiện.',
    );
    normalized.coherence = this.normalizeFeedbackItem(
      normalized.coherence,
      'Phản hồi về sự liên kết đang được hoàn thiện.',
    );

    normalized.overallFeedback =
      typeof normalized.overallFeedback === 'string' &&
      normalized.overallFeedback.trim().length >= 20
        ? normalized.overallFeedback.trim().slice(0, 500)
        : 'Bài viết có ý tưởng hay và có thể cải thiện thêm về cấu trúc, mạch lạc và chi tiết minh họa.';

    normalized.strengths = this.normalizeStringList(normalized.strengths, [
      'Ý tưởng rõ ràng',
      'Giọng văn chân thật',
    ]);
    normalized.areasForImprovement = this.normalizeStringList(
      normalized.areasForImprovement,
      ['Cấu trúc bài viết', 'Mạch lạc và liên kết'],
    );
    normalized.actionItems = this.normalizeStringList(normalized.actionItems, [
      'Đọc kỹ phản hồi',
      'Sửa từng phần một',
    ]);

    if (
      typeof normalized.sampleWriting === 'string' &&
      normalized.sampleWriting.trim().length >= 100
    ) {
      normalized.sampleWriting = normalized.sampleWriting
        .trim()
        .slice(0, 20000);
    } else {
      delete normalized.sampleWriting;
    }

    return normalized;
  }

  private normalizeFeedbackItem(item: unknown, fallbackFeedback: string) {
    const raw = asRawFeedbackItem(item);
    const score =
      typeof raw?.score === 'number'
        ? Math.max(1, Math.min(10, Math.round(raw.score)))
        : 5;

    const feedback =
      typeof raw?.feedback === 'string' && raw.feedback.trim().length >= 10
        ? raw.feedback.trim().slice(0, 1000)
        : fallbackFeedback;

    const suggestions = this.normalizeStringList(raw?.suggestions, [
      'Cải thiện phần này với một gợi ý cụ thể',
    ]).slice(0, 5);

    return {
      score,
      feedback,
      suggestions,
    };
  }

  private normalizeStringList(value: unknown, defaults: string[]): string[] {
    const items = (Array.isArray(value) ? value : [])
      .filter((item) => typeof item === 'string')
      .map((item) => item.trim())
      .filter((item) => item.length >= 5)
      .map((item) => item.slice(0, 150));

    for (const fallback of defaults) {
      if (items.length >= 2) {
        break;
      }

      if (!items.includes(fallback)) {
        items.push(fallback);
      }
    }

    return items.slice(0, 5);
  }

  /**
   * Format Zod validation errors for logging
   */
  private formatZodErrors(error: z.ZodError): string[] {
    return error.errors.map((err) => {
      const path = err.path.join('.');
      return `${path}: ${err.message}`;
    });
  }

  /**
   * Validate data structure without full parsing
   */
  validateStructure(data: unknown): boolean {
    const result = WritingAnalyticsSchema.safeParse(data);
    return result.success;
  }

  /**
   * Get schema for documentation
   */
  getSchema() {
    return WritingAnalyticsSchema;
  }
}
