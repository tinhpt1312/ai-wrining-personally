import { Injectable, Logger } from '@nestjs/common';
import { ENV } from 'src/config/env.config';
import { AiError, AiErrorCode } from '../utils/ai-error-handler';
import OpenAI from 'openai';
import { BASE_URL_AI } from 'src/constants';

export interface AiProviderRequest {
  prompt: string;
  temperature?: number;
  maxTokens?: number;
}

export interface AiProviderResponse {
  text: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

@Injectable()
export class OpenAiProvider {
  private readonly logger = new Logger(OpenAiProvider.name);
  private genAi: OpenAI;

  constructor() {
    this.genAi = new OpenAI({
      apiKey: ENV.ONEROUTER.API_KEY,
      baseURL: BASE_URL_AI,
    });
  }

  async generateAnalytics(
    request: AiProviderRequest,
  ): Promise<AiProviderResponse> {
    try {
      const response = await this.genAi.chat.completions.create({
        model: ENV.ONEROUTER.MODEL || '',
        messages: [
          {
            role: 'user',
            content: request.prompt,
          },
        ],
        temperature: request.temperature ?? ENV.ONEROUTER.TEMPERATURE,
        max_tokens: request.maxTokens ?? ENV.ONEROUTER.MAX_TOKENS ?? 2500,
      });

      const text = response.choices?.[0]?.message?.content;

      if (!text) {
        throw new AiError(
          'No response text from OpenRouter',
          AiErrorCode.INVALID_RESPONSE,
        );
      }

      // OpenRouter/ONEROUTER API usage metadata
      const inputTokens = response.usage?.prompt_tokens ?? 0;
      const outputTokens = response.usage?.completion_tokens ?? 0;

      this.logger.debug(
        `OpenRouter API response: ${inputTokens} input tokens, ${outputTokens} output tokens`,
      );

      return {
        text,
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens,
      };
    } catch (error) {
      this.logger.error('OpenRouter API error:', error);

      if (error instanceof AiError) {
        throw error;
      }

      const err = error as any;
      if (err?.status === 429) {
        throw new AiError(
          'OpenRouter API rate limited',
          AiErrorCode.RATE_LIMITED,
          true,
          60,
        );
      }

      if (err?.status === 503) {
        throw new AiError(
          'OpenRouter API unavailable',
          AiErrorCode.SERVICE_UNAVAILABLE,
          true,
          30,
        );
      }

      throw new AiError(
        `OpenRouter API error: ${err?.message || 'Unknown error'}`,
        AiErrorCode.API_ERROR,
        true,
      );
    }
  }

  async checkConnectivity(): Promise<boolean> {
    try {
      await this.genAi.chat.completions.create({
        model: ENV.ONEROUTER.MODEL || '',
        messages: [
          {
            role: 'user',
            content: 'ping',
          },
        ],
        temperature: 0.1,
        max_tokens: ENV.ONEROUTER.MAX_TOKENS ?? 2500,
      });
      return true;
    } catch (error) {
      const err = error as any;
      this.logger.warn(
        'OpenAI connectivity check failed:',
        err?.message || 'Unknown error',
      );
      return false;
    }
  }

  /**
   * Generate a daily writing tip based on a category
   */
  async generateDailyTip(category: string): Promise<{
    title: string;
    content: string;
    exampleBefore: string;
    exampleAfter: string;
  }> {
    const prompt = `Generate a brief daily writing tip about ${category}. 
    
    Format your response as JSON with the following fields:
    {
      "title": "A catchy title for the tip",
      "content": "2-3 sentences explaining the writing tip",
      "exampleBefore": "Example of incorrect/poor writing",
      "exampleAfter": "Example of correct/improved writing"
    }`;

    try {
      const response = await this.generateAnalytics({
        prompt,
        temperature: 0.7,
        maxTokens: 500,
      });

      const parsed = JSON.parse(response.text);
      return {
        title: parsed.title || 'Daily Writing Tip',
        content: parsed.content || '',
        exampleBefore: parsed.exampleBefore || '',
        exampleAfter: parsed.exampleAfter || '',
      };
    } catch (error) {
      this.logger.error('Failed to generate daily tip:', error);
      throw new AiError(
        'Failed to generate daily tip',
        AiErrorCode.API_ERROR,
        true,
      );
    }
  }

  /**
   * Generate writing suggestions for improvement
   */
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
        ? ` Focus on: ${focusAreas.join(', ')}`
        : ' Look for all types of improvements.';

    const prompt = `Analyze the following text and provide specific suggestions for improvement.${focusAreasString}
    
    Text: "${text.substring(0, 2000)}"
    
    Format your response as a JSON array. Each suggestion should have:
    {
      "type": "grammar|vocabulary|punctuation|style|clarity|tone",
      "originalText": "the original phrase",
      "suggestedText": "the improved phrase",
      "explanation": "why this is better",
      "confidenceScore": 0.5-1.0,
      "severity": "error|warning|suggestion|info"
    }
    
    Return only valid JSON, no other text.`;

    try {
      const response = await this.generateAnalytics({
        prompt,
        temperature: 0.5,
        maxTokens: 1500,
      });

      const parsed = JSON.parse(response.text);
      const suggestions = Array.isArray(parsed) ? parsed : [parsed];

      return suggestions.map((s: any) => ({
        type: s.type || 'suggestion',
        originalText: s.originalText || '',
        suggestedText: s.suggestedText || '',
        explanation: s.explanation || '',
        confidenceScore:
          typeof s.confidenceScore === 'number' ? s.confidenceScore : 0.7,
        severity: s.severity || 'suggestion',
      }));
    } catch (error) {
      this.logger.error('Failed to generate suggestions:', error);
      throw new AiError(
        'Failed to generate writing suggestions',
        AiErrorCode.API_ERROR,
        true,
      );
    }
  }
}
