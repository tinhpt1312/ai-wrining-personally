import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateBookProgressDTO {
  @ApiProperty({ description: 'Current chapter ID' })
  @IsUUID('4', { message: 'Chapter ID must be a valid UUID' })
  chapterId: string;

  @ApiProperty({ required: false, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Scroll offset must be an integer' })
  @Min(0, { message: 'Scroll offset must be at least 0' })
  scrollOffset?: number;

  @ApiProperty({ required: false, description: 'Percent complete 0-100' })
  @IsOptional()
  @Type(() => Number)
  @Min(0, { message: 'Percent complete must be at least 0' })
  @Max(100, { message: 'Percent complete must not exceed 100' })
  percentComplete?: number;
}
