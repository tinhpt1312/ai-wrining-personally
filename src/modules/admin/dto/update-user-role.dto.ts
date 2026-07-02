import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { Role } from 'src/types/auth.type';

export class UpdateUserRoleDTO {
  @ApiProperty({ enum: Role })
  @IsNotEmpty({ message: 'Role is required' })
  @IsEnum(Role, {
    message: `Role must be one of: ${Object.values(Role).join(', ')}`,
  })
  role!: Role;
}
