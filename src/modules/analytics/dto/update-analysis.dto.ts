import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsObject } from 'class-validator';
import type { JsonRecord } from 'src/types';

export class UpdateAnalyticsDTO {
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
