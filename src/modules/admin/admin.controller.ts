import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from 'src/types/auth.type';
import type { RequestWithUser } from 'src/types';
import { AdminService } from './admin.service';
import {
  QueryAdminUsersDTO,
  UpdateUserRoleDTO,
  UpdateUserStatusDTO,
} from './dto';

@ApiTags('Admin')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('overview')
  getOverview() {
    return this.adminService.getOverview();
  }

  @Get('users')
  findAllUsers(@Query() query: QueryAdminUsersDTO) {
    return this.adminService.findAllUsers(query);
  }

  @Patch('users/:id/role')
  updateUserRole(
    @Param('id') id: string,
    @Body() dto: UpdateUserRoleDTO,
    @Req() req: RequestWithUser,
  ) {
    return this.adminService
      .updateUserRole(id, dto, req.user.userId)
      .then((data) => ({ data }));
  }

  @Patch('users/:id/status')
  updateUserStatus(
    @Param('id') id: string,
    @Body() dto: UpdateUserStatusDTO,
    @Req() req: RequestWithUser,
  ) {
    return this.adminService
      .updateUserStatus(id, dto, req.user.userId)
      .then((data) => ({ data }));
  }
}
