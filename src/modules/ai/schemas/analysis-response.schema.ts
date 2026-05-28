import { z } from 'zod';

/**
 * Zod schemas for AI-generated writing analysis responses
 */

export const FeedbackItemSchema = z.object({
  score: z.number().int().min(1).max(10),
  feedback: z.string().min(10).max(1000),
  suggestions: z.array(z.string().min(5).max(200)).min(1).max(5),
});

export type FeedbackItem = z.infer<typeof FeedbackItemSchema>;

export const WritingAnalyticsSchema = z.object({
  structure: FeedbackItemSchema,
  clarity: FeedbackItemSchema,
  tone: FeedbackItemSchema,
  coherence: FeedbackItemSchema,
  overallFeedback: z.string().min(20).max(500),
  strengths: z.array(z.string().min(5).max(150)).min(2).max(5),
  areasForImprovement: z.array(z.string().min(5).max(150)).min(2).max(5),
  actionItems: z.array(z.string().min(5).max(150)).min(2).max(5),
});

export type WritingAnalytics = z.infer<typeof WritingAnalyticsSchema>;

/**
 * Partial schema for fallback/incomplete responses
 */
export const PartialWritingAnalyticsSchema = WritingAnalyticsSchema.partial();

export type PartialWritingAnalytics = z.infer<
  typeof PartialWritingAnalyticsSchema
>;

/**
 * Response parser result
 */
export const ResponseParserResultSchema = z.object({
  valid: z.boolean(),
  data: WritingAnalyticsSchema.optional(),
  errors: z.array(z.string()).optional(),
  rawContent: z.string(),
});

export type ResponseParserResult = z.infer<typeof ResponseParserResultSchema>;
