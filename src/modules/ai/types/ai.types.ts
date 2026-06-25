import type { JsonRecord } from 'src/types';

export enum WritingType {
  SOCIAL_ESSAY = 'BÀI LUẬN XÃ HỘI',
  CATHOLIC_ESSAY = 'BÀI LUẬN CÔNG GIÁO',
  SHORT_STORY = 'TRUYỆN NGẮN',
  ARTICLE = 'BÀI BÁO',
}

export interface OpenAiResponse {
  content: string;
  tokensUsed: number;
  model: string;
  promptTokens: number;
  completionTokens: number;
}

export interface TokenUsageInfo {
  used: number;
  remaining: number;
  limit: number;
  percentage: number;
  resetAt: string;
}

export interface AiAnalyticsResult {
  success: boolean;
  data?: JsonRecord;
  tokensUsed?: number;
  error?: AiErrorDetails;
}

export interface AiErrorDetails {
  code: string;
  message: string;
  retryable: boolean;
  retryAfter?: number;
  statusCode?: number;
}
