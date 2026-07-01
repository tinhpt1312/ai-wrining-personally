import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BookCategoryEnum, BookSourceTypeEnum } from '../enum';
import { ACTIVE_WRITING_TYPE_VALUES } from '../../writings/constants/active-writing-types';

export class CreateBookDTO {
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

  @ApiProperty({ description: 'Tags for search and filtering', type: [String] })
  @IsOptional()
  @IsArray({ message: 'Tags must be an array' })
  @IsString({ each: true, message: 'Each tag must be a string' })
  tags?: string[];

  @ApiProperty({
    description: 'Source type',
    enum: BookSourceTypeEnum,
    default: BookSourceTypeEnum.EXTERNAL_LINK,
  })
  @IsOptional()
  @IsEnum(BookSourceTypeEnum, {
    message: `Source type must be one of: ${Object.values(BookSourceTypeEnum).join(', ')}`,
  })
  sourceType?: BookSourceTypeEnum;

  @ApiProperty({ description: 'External link to read or buy the book', required: false })
  @IsOptional()
  @IsUrl({}, { message: 'External URL must be a valid URL' })
  @MaxLength(500, { message: 'External URL must not exceed 500 characters' })
  externalUrl?: string;

  @ApiProperty({
    description: 'Writing types this book supports',
    enum: ACTIVE_WRITING_TYPE_VALUES,
    isArray: true,
  })
  @IsOptional()
  @IsArray({ message: 'Writing types must be an array' })
  @IsString({ each: true, message: 'Each writing type must be a string' })
  writingTypes?: string[];

  @ApiProperty({ description: 'Estimated reading time in minutes', required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Reading time must be an integer' })
  @Min(1, { message: 'Reading time must be at least 1 minute' })
  @Max(10000, { message: 'Reading time must not exceed 10000 minutes' })
  readingTimeMinutes?: number;

  @ApiProperty({ description: 'Whether the book is visible in the catalog', default: true })
  @IsOptional()
  @IsBoolean({ message: 'isPublic must be a boolean' })
  isPublic?: boolean;
}
