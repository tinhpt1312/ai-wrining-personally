import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';
import { VALIDATION_MESSAGES } from 'src/constants';

export class ChangePasswordDTO {
  @ApiProperty({ example: 'oldPassword123' })
  @IsString()
  currentPassword!: string;

  @ApiProperty({ example: 'newPassword456' })
  @IsString()
  @MinLength(6, { message: VALIDATION_MESSAGES.newPasswordMinLength })
  newPassword!: string;
}
