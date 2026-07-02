import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty } from 'class-validator';

export class UpdateUserStatusDTO {
  @ApiProperty({ description: 'Whether the user account is active' })
  @IsNotEmpty({ message: 'isActive is required' })
  @IsBoolean({ message: 'isActive must be a boolean' })
  isActive!: boolean;
}
