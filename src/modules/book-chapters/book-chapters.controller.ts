import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard';
import { Roles } from 'src/modules/auth/decorators/roles.decorator';
import { Role } from 'src/types/auth.type';
import type { RequestWithUser } from 'src/types';
import { UploadBookDTO } from 'src/modules/books/dto';
import { UpdateBookProgressDTO } from './dto';
import { BookChaptersService, BookProgressService, BookIngestService } from './servies';

@ApiTags('book-chapters')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('books')
export class BookChaptersController {
  constructor(
    private readonly chaptersService: BookChaptersService,
    private readonly progressService: BookProgressService,
    private readonly ingestService: BookIngestService,
  ) {}

  @Post('upload')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        title: { type: 'string' },
        author: { type: 'string' },
        description: { type: 'string' },
        coverUrl: { type: 'string' },
        category: { type: 'string' },
        tags: { type: 'string', description: 'JSON array or comma-separated' },
        writingTypes: {
          type: 'string',
          description: 'JSON array or comma-separated',
        },
      },
      required: ['file', 'title', 'author', 'category'],
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 15 * 1024 * 1024 },
    }),
  )
  async uploadBook(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadBookDTO,
    @Req() req: RequestWithUser,
  ) {
    const result = await this.ingestService.uploadBook(file, dto, req.user);
    return { data: result };
  }

  @Get(':id/chapters')
  async getChapters(@Param('id') id: string, @Req() req: RequestWithUser) {
    const chapters = await this.chaptersService.findSummariesByBook(id, {
      userId: req.user.userId,
      role: req.user.role,
    });
    return { data: chapters };
  }

  @Get(':id/chapters/:chapterId')
  async getChapter(
    @Param('id') id: string,
    @Param('chapterId') chapterId: string,
    @Req() req: RequestWithUser,
  ) {
    const chapter = await this.chaptersService.findOne(id, chapterId, {
      userId: req.user.userId,
      role: req.user.role,
    });
    return { data: chapter };
  }

  @Get(':id/progress')
  async getProgress(@Param('id') id: string, @Req() req: RequestWithUser) {
    const progress = await this.progressService.getProgress(
      req.user.userId,
      id,
      req.user.role,
    );
    return { data: progress };
  }

  @Put(':id/progress')
  async updateProgress(
    @Param('id') id: string,
    @Body() dto: UpdateBookProgressDTO,
    @Req() req: RequestWithUser,
  ) {
    const progress = await this.progressService.upsertProgress(
      req.user.userId,
      id,
      dto,
      req.user.role,
    );
    return { data: progress };
  }

  @Post(':id/ingest')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
      required: ['file'],
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 15 * 1024 * 1024 },
    }),
  )
  async ingestBook(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: RequestWithUser,
  ) {
    const result = await this.ingestService.ingestFile(id, file, {
      userId: req.user.userId,
      role: req.user.role,
    });
    return { data: result };
  }
}
