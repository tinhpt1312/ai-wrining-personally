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
import type { RequestWithUser } from 'src/types/auth.type';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { QueryWritingDTO } from '../writings/dto';
import { WritingsService } from '../writings/writings.service';
import { ChangePasswordDTO, UpdateProfileDTO } from './dto';
import { UsersService } from './users.service';

@Controller('users')
@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly writingsService: WritingsService,
  ) {}

  @Get('me')
  getMe(@Req() req: RequestWithUser) {
    return this.usersService.getMe(req.user.userId);
  }

  @Patch('me')
  updateProfile(@Req() req: RequestWithUser, @Body() dto: UpdateProfileDTO) {
    return this.usersService.updateProfile(req.user.userId, dto);
  }

  @Patch('me/password')
  changePassword(@Req() req: RequestWithUser, @Body() dto: ChangePasswordDTO) {
    return this.usersService.changePassword(req.user.userId, dto);
  }

  @Get(':username/profile')
  getPublicProfile(@Param('username') username: string) {
    return this.usersService.getPublicProfile(username);
  }

  @Get(':username/writings')
  getPublicWritings(
    @Param('username') username: string,
    @Query() query: QueryWritingDTO,
  ) {
    return this.writingsService.findPublicByUsername(username, query);
  }
}
