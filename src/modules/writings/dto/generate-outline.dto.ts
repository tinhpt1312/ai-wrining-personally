import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsIn,
  MaxLength,
  MinLength,
} from 'class-validator';
import { WritingTypeEnum } from '../enum';
import {
  ACTIVE_WRITING_TYPE_VALUES,
  ACTIVE_WRITING_TYPE_MESSAGE,
} from '../constants/active-writing-types';

export class GenerateOutlineDTO {
  @ApiProperty({
    description: 'Writing title or prompt title',
    example: 'Vai trò của gia đình trong xã hội hiện đại',
  })
  @IsNotEmpty({ message: 'Title is required' })
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  title: string;

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
    description: 'Optional topic or prompt description for context',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  topic?: string;
}
