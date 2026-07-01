import { ApiProperty } from '@nestjs/swagger';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  ACTIVE_WRITING_TYPE_VALUES,
  ACTIVE_WRITING_TYPE_MESSAGE,
} from '../../writings/constants/active-writing-types';
import { WritingTypeEnum } from '../../writings/enum';

export class RecommendBooksDTO {
  @ApiProperty({ description: 'Writing type to recommend books for', enum: ACTIVE_WRITING_TYPE_VALUES })
  @IsNotEmpty({ message: 'Writing type is required' })
  @IsIn(ACTIVE_WRITING_TYPE_VALUES, { message: ACTIVE_WRITING_TYPE_MESSAGE })
  writingType: WritingTypeEnum;

  @ApiProperty({ description: 'Essay topic or theme', required: false })
  @IsOptional()
  @IsString({ message: 'Topic must be a string' })
  @MaxLength(500, { message: 'Topic must not exceed 500 characters' })
  topic?: string;

  @ApiProperty({ description: 'Draft excerpt for context', required: false })
  @IsOptional()
  @IsString({ message: 'Draft excerpt must be a string' })
  @MaxLength(2000, { message: 'Draft excerpt must not exceed 2000 characters' })
  draftExcerpt?: string;

  @ApiProperty({ description: 'Number of recommendations', required: false, default: 3 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Count must be an integer' })
  @Min(1, { message: 'Count must be at least 1' })
  @Max(5, { message: 'Count must not exceed 5' })
  count?: number;
}
