import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsUUID,
  IsOptional,
  IsBoolean,
  IsEnum,
} from 'class-validator';
import { WritingType } from 'src/types/ai.type';
import type { JsonRecord } from 'src/types';

/**
 * DTO for creating an analysis with AI generation
 * Extends base CreateAnalyticsDTO with AI-specific parameters
 */
export class CreateAiAnalyticsDTO {
  @ApiProperty({
    description: 'ID of the writing to analyze',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsNotEmpty({ message: 'Writing ID is required' })
  @IsUUID('4', { message: 'Writing ID must be a valid UUID' })
  writingId: string;

  @ApiProperty({
    description: 'Whether to trigger AI analysis (default: true)',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'triggerAi must be a boolean' })
  triggerAi: boolean = true;

  @ApiProperty({
    description:
      'Type of writing (determines analysis focus and prompt strategy)',
    enum: WritingType,
    example: WritingType.SOCIAL_ESSAY,
    required: false,
  })
  @IsOptional()
  @IsEnum(WritingType, {
    message: 'Invalid writing type',
  })
  writingType?: WritingType;

  @ApiProperty({
    description: 'Optional initial feedback (can be combined with AI analysis)',
    example: {
      userNotes: 'Focus on clarity',
    },
    required: false,
  })
  @IsOptional()
  feedbackJson?: JsonRecord;

  @ApiProperty({
    description: 'Previous analysis ID when re-grading after revision',
    required: false,
  })
  @IsOptional()
  @IsUUID('4', { message: 'Previous analysis ID must be a valid UUID' })
  previousAnalysisId?: string;
}
