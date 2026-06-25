import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID, MinLength } from 'class-validator';

export class EnsureBaselineRevisionDTO {
  @ApiProperty({ description: 'Analysis ID that started this revision round' })
  @IsNotEmpty()
  @IsUUID('4')
  analysisId!: string;

  @ApiProperty({ description: 'Content snapshot before user edits' })
  @IsNotEmpty()
  @IsString()
  @MinLength(1)
  content!: string;
}
