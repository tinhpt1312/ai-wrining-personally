import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';
import type { WritingRevisionSource } from 'src/entities/writing-revision.entity';

export class CreateWritingRevisionDTO {
  @ApiProperty({ description: 'Snapshot content' })
  @IsNotEmpty()
  @IsString()
  @MinLength(1)
  content!: string;

  @ApiPropertyOptional({
    enum: [
      'manual',
      'suggestions',
      'sample',
      'revision_workspace',
      'grading_baseline',
    ],
    default: 'revision_workspace',
  })
  @IsOptional()
  @IsEnum([
    'manual',
    'suggestions',
    'sample',
    'revision_workspace',
    'grading_baseline',
  ])
  source?: WritingRevisionSource;

  @ApiPropertyOptional({ description: 'Related analysis ID' })
  @IsOptional()
  @IsUUID('4')
  analysisId?: string;

  @ApiPropertyOptional({ description: 'Parent revision ID for chaining' })
  @IsOptional()
  @IsUUID('4')
  parentRevisionId?: string;
}
