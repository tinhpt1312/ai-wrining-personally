import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  IsIn,
  MaxLength,
  MinLength,
} from 'class-validator';
import { WritingTypeEnum, WritingStatusEnum } from '../enum';
import {
  ACTIVE_WRITING_TYPE_VALUES,
  ACTIVE_WRITING_TYPE_MESSAGE,
} from '../constants/active-writing-types';

export class UpdateWritingDTO {
  @ApiProperty({
    description: 'Title of the writing',
    example: 'Updated Journal Entry',
    minLength: 3,
    maxLength: 255,
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Title must be a string' })
  @MinLength(3, { message: 'Title must be at least 3 characters long' })
  @MaxLength(255, { message: 'Title must not exceed 255 characters' })
  title?: string;

  @ApiProperty({
    description: 'Content of the writing',
    example: 'Updated content...',
    minLength: 10,
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Content must be a string' })
  @MinLength(10, { message: 'Content must be at least 10 characters long' })
  content?: string;

  @ApiProperty({
    description: 'Type of writing',
    enum: ACTIVE_WRITING_TYPE_VALUES,
    required: false,
  })
  @IsOptional()
  @IsIn(ACTIVE_WRITING_TYPE_VALUES, {
    message: ACTIVE_WRITING_TYPE_MESSAGE,
  })
  type?: WritingTypeEnum;

  @ApiProperty({
    description: 'Status of the writing',
    enum: WritingStatusEnum,
    required: false,
  })
  @IsOptional()
  @IsEnum(WritingStatusEnum, {
    message: `Status must be one of: ${Object.values(WritingStatusEnum).join(', ')}`,
  })
  status?: WritingStatusEnum;

  @ApiProperty({
    description: 'Structured outline for the writing',
    required: false,
  })
  @IsOptional()
  @IsObject()
  outlineJson?: Record<string, unknown>;
}
