import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RejectBookDTO {
  @ApiProperty({ description: 'Reason for rejection', required: false })
  @IsOptional()
  @IsString({ message: 'Rejection reason must be a string' })
  @MaxLength(1000, { message: 'Rejection reason must not exceed 1000 characters' })
  reason?: string;
}
