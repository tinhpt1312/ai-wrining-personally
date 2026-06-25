import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID, IsOptional, IsObject } from 'class-validator';
import type { JsonRecord } from 'src/types';

export class CreateAnalyticsDTO {
  @ApiProperty({
    description: 'ID of the writing to analyze',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsNotEmpty({ message: 'Writing ID is required' })
  @IsUUID('4', { message: 'Writing ID must be a valid UUID' })
  writingId: string;

  @ApiProperty({
    description:
      'AI-generated feedback and analysis data (JSON structure varies by use case)',
    example: {
      tone: 'formal',
      confidence: 0.95,
      suggestions: ['Consider a more conversational tone', 'Add more emotion'],
    },
    required: false,
  })
  @IsOptional()
  @IsObject({ message: 'Feedback must be an object' })
  feedbackJson?: JsonRecord;
}
