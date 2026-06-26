import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { WritingTypeEnum } from '../enum';
import {
  ACTIVE_WRITING_TYPE_VALUES,
  ACTIVE_WRITING_TYPE_MESSAGE,
} from '../constants/active-writing-types';

export const PROMPT_DIFFICULTY_VALUES = ['dễ', 'trung bình', 'khó'] as const;
export type PromptDifficulty = (typeof PROMPT_DIFFICULTY_VALUES)[number];

export class GenerateWritingPromptsDTO {
  @ApiProperty({
    description: 'Type of writing',
    enum: ACTIVE_WRITING_TYPE_VALUES,
  })
  @IsNotEmpty()
  @IsIn(ACTIVE_WRITING_TYPE_VALUES, {
    message: ACTIVE_WRITING_TYPE_MESSAGE,
  })
  type: WritingTypeEnum;

  @ApiProperty({
    description: 'Difficulty level',
    enum: PROMPT_DIFFICULTY_VALUES,
    required: false,
  })
  @IsOptional()
  @IsIn(PROMPT_DIFFICULTY_VALUES)
  difficulty?: PromptDifficulty;

  @ApiProperty({
    description: 'Number of prompts to generate (1–6)',
    required: false,
    default: 4,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(6)
  count?: number;

  @ApiProperty({
    description: 'Titles to avoid when regenerating prompts in the same session',
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(255, { each: true })
  excludeTitles?: string[];
}
