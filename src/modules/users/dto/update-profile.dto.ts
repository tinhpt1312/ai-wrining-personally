import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { VALIDATION_MESSAGES } from 'src/constants';

export class UpdateProfileDTO {
  @ApiProperty({ required: false, example: 'Nguyen Van A' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  fullName?: string;

  @ApiProperty({ required: false, example: 'user@example.com' })
  @IsOptional()
  @IsEmail({}, { message: VALIDATION_MESSAGES.emailInvalid })
  email?: string;

  @ApiProperty({ required: false, example: 'new_username' })
  @IsOptional()
  @IsString()
  @MinLength(3, { message: VALIDATION_MESSAGES.usernameMinLength })
  @MaxLength(255)
  username?: string;
}
