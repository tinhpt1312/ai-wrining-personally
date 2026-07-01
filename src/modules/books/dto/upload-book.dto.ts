import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { BookCategoryEnum } from '../enum';
import { ACTIVE_WRITING_TYPE_VALUES } from '../../writings/constants/active-writing-types';

function parseJsonArray(value: unknown): string[] | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  if (Array.isArray(value)) {
    return value as string[];
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : undefined;
    } catch {
      return value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }
  return undefined;
}

export class UploadBookDTO {
  @ApiProperty({ description: 'Book title', minLength: 2, maxLength: 255 })
  @IsNotEmpty({ message: 'Title is required' })
  @IsString({ message: 'Title must be a string' })
  @MinLength(2, { message: 'Title must be at least 2 characters long' })
  @MaxLength(255, { message: 'Title must not exceed 255 characters' })
  title: string;

  @ApiProperty({ description: 'Book author', minLength: 2, maxLength: 255 })
  @IsNotEmpty({ message: 'Author is required' })
  @IsString({ message: 'Author must be a string' })
  @MinLength(2, { message: 'Author must be at least 2 characters long' })
  @MaxLength(255, { message: 'Author must not exceed 255 characters' })
  author: string;

  @ApiProperty({ description: 'Book description', required: false })
  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  description?: string;

  @ApiProperty({ description: 'Cover image URL', required: false })
  @IsOptional()
  @IsUrl({}, { message: 'Cover URL must be a valid URL' })
  @MaxLength(500, { message: 'Cover URL must not exceed 500 characters' })
  coverUrl?: string;

  @ApiProperty({ description: 'Book category', enum: BookCategoryEnum })
  @IsNotEmpty({ message: 'Category is required' })
  @IsEnum(BookCategoryEnum, {
    message: `Category must be one of: ${Object.values(BookCategoryEnum).join(', ')}`,
  })
  category: BookCategoryEnum;

  @ApiProperty({ description: 'Tags for search and filtering', type: [String], required: false })
  @IsOptional()
  @Transform(({ value }) => parseJsonArray(value))
  @IsArray({ message: 'Tags must be an array' })
  @IsString({ each: true, message: 'Each tag must be a string' })
  tags?: string[];

  @ApiProperty({
    description: 'Writing types this book supports',
    enum: ACTIVE_WRITING_TYPE_VALUES,
    isArray: true,
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => parseJsonArray(value))
  @IsArray({ message: 'Writing types must be an array' })
  @IsString({ each: true, message: 'Each writing type must be a string' })
  writingTypes?: string[];
}
