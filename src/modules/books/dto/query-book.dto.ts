import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsNumber,
  Min,
  Max,
  IsString,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { BookCategoryEnum } from '../enum';
import { WritingTypeEnum } from '../../writings/enum';

export class QueryBookDTO {
  @ApiProperty({ required: false, default: 12, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Limit must be a number' })
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(100, { message: 'Limit must not exceed 100' })
  limit?: number = 12;

  @ApiProperty({ required: false, default: 0, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Offset must be a number' })
  @Min(0, { message: 'Offset must be at least 0' })
  offset?: number = 0;

  @ApiProperty({ required: false, enum: BookCategoryEnum })
  @IsOptional()
  @IsEnum(BookCategoryEnum, {
    message: `Category must be one of: ${Object.values(BookCategoryEnum).join(', ')}`,
  })
  category?: BookCategoryEnum;

  @ApiProperty({ required: false, enum: WritingTypeEnum })
  @IsOptional()
  @IsEnum(WritingTypeEnum, {
    message: `Writing type must be one of: ${Object.values(WritingTypeEnum).join(', ')}`,
  })
  writingType?: WritingTypeEnum;

  @ApiProperty({ required: false, description: 'Search by title, author, or tags' })
  @IsOptional()
  @IsString({ message: 'Search must be a string' })
  search?: string;

  @ApiProperty({
    required: false,
    description: 'Include non-public books (admin only)',
    default: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean({ message: 'includePrivate must be a boolean' })
  includePrivate?: boolean;
}
