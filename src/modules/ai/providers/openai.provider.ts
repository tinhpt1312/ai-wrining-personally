import { Injectable, Logger } from '@nestjs/common';
import { ENV } from 'src/config/env.config';
import { AiError, AiErrorCode } from '../utils/ai-error-handler';
import OpenAI from 'openai';

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
      baseURL: 'https://openrouter.ai/api/v1', // Use OpenRouter endpoint
    });
  }

  async generateAnalysis(
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
        max_tokens: request.maxTokens ?? 1200,
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

      if (error.status === 429) {
        throw new AiError(
          'OpenRouter API rate limited',
          AiErrorCode.RATE_LIMITED,
          true,
          60,
        );
      }

      if (error.status === 503) {
        throw new AiError(
          'OpenRouter API unavailable',
          AiErrorCode.SERVICE_UNAVAILABLE,
          true,
          30,
        );
      }

      throw new AiError(
        `OpenRouter API error: ${error.message}`,
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
        max_tokens: 1200,
      });
      return true;
    } catch (error) {
      this.logger.warn('OpenAI connectivity check failed:', error.message);
      return false;
    }
  }
}
