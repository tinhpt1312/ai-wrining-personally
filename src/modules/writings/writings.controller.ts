import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Writing } from 'src/entities';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import type { RequestWithUser } from 'src/types';
import { CreateWritingDTO, QueryWritingDTO, UpdateWritingDTO } from './dto';
import { WritingsService } from './writings.service';

@ApiTags('writings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('writings')
export class WritingsController {
  constructor(private readonly writingsService: WritingsService) {}

  @Post()
  async create(@Body() dto: CreateWritingDTO, @Req() req: RequestWithUser) {
    return this.writingsService.create(req.user.userId, dto);
  }

  @Get('stats/overview')
  async getStats(@Req() req: RequestWithUser) {
    return this.writingsService.getStats(req.user.userId);
  }

  @Get('public')
  async findAllPublic(@Query() query: QueryWritingDTO) {
    return this.writingsService.findAllPublic(query);
  }

  @Get()
  async findAll(@Query() query: QueryWritingDTO, @Req() req: RequestWithUser) {
    return this.writingsService.findAll(req.user.userId, query);
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
  ): Promise<Writing> {
    return this.writingsService.findOne(id, req.user.userId);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateWritingDTO,
    @Req() req: RequestWithUser,
  ): Promise<Writing> {
    return this.writingsService.update(id, req.user.userId, dto);
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
  ): Promise<{ message: string }> {
    return this.writingsService.remove(id, req.user.userId);
  }
}
