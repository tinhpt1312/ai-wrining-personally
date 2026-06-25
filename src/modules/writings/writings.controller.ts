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
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { Writing } from 'src/entities';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { ExportService } from 'src/modules/analytics/services/export.service';
import { buildAttachmentDisposition } from 'src/common/utils/content-disposition.util';
import type { RequestWithUser } from 'src/types';
import {
  CreateWritingDTO,
  QueryWritingDTO,
  UpdateWritingDTO,
  CreateWritingRevisionDTO,
  EnsureBaselineRevisionDTO,
  GenerateOutlineDTO,
} from './dto';
import { WritingsService } from './writings.service';
import { WritingRevisionsService } from './writing-revisions.service';
import { WritingOutlineService } from './services/writing-outline.service';
import { TokenLimitGuard } from '../analytics/guards/token-limit.guard';

@ApiTags('writings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('writings')
export class WritingsController {
  constructor(
    private readonly writingsService: WritingsService,
    private readonly revisionsService: WritingRevisionsService,
    private readonly exportService: ExportService,
    private readonly outlineService: WritingOutlineService,
  ) {}

  @Post('outline')
  @UseGuards(TokenLimitGuard)
  async generateOutline(
    @Body() dto: GenerateOutlineDTO,
    @Req() req: RequestWithUser,
  ) {
    const outline = await this.outlineService.generate(req.user.userId, dto);
    return { data: outline };
  }

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

  @Get(':id/revisions/timeline')
  async getRevisionTimeline(
    @Param('id') id: string,
    @Query('analysisId') analysisId: string | undefined,
    @Req() req: RequestWithUser,
  ) {
    return this.revisionsService.findTimeline(
      id,
      req.user.userId,
      analysisId,
    );
  }

  @Post(':id/revisions/baseline')
  async ensureBaselineRevision(
    @Param('id') id: string,
    @Body() dto: EnsureBaselineRevisionDTO,
    @Req() req: RequestWithUser,
  ) {
    const revision = await this.revisionsService.ensureGradingBaseline(
      id,
      req.user.userId,
      dto,
    );
    return { data: revision };
  }

  @Get(':id/revisions/:revisionId')
  async getRevision(
    @Param('id') id: string,
    @Param('revisionId') revisionId: string,
    @Req() req: RequestWithUser,
  ) {
    const revision = await this.revisionsService.findOne(
      id,
      revisionId,
      req.user.userId,
    );
    return { data: revision };
  }

  @Get(':id/revisions')
  async getRevisions(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.revisionsService.findByWriting(id, req.user.userId);
  }

  @Post(':id/revisions')
  async createRevision(
    @Param('id') id: string,
    @Body() dto: CreateWritingRevisionDTO,
    @Req() req: RequestWithUser,
  ) {
    const revision = await this.revisionsService.create(
      id,
      req.user.userId,
      dto,
    );
    return { data: revision };
  }

  @Post(':id/revisions/:revisionId/restore')
  async restoreRevision(
    @Param('id') id: string,
    @Param('revisionId') revisionId: string,
    @Req() req: RequestWithUser,
  ) {
    const writing = await this.revisionsService.restore(
      id,
      revisionId,
      req.user.userId,
    );
    return { data: writing };
  }

  @Get(':id/export/docx')
  async exportDocx(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
    @Res() res: Response,
  ): Promise<void> {
    const { buffer, fileName } = await this.exportService.exportWritingDocx(
      id,
      req.user.userId,
    );
    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': buildAttachmentDisposition(fileName),
      'Content-Length': buffer.length,
    });
    res.send(buffer);
  }

  @Get(':id/export/pdf')
  async exportPdf(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
    @Res() res: Response,
  ): Promise<void> {
    const { buffer, fileName } = await this.exportService.exportWritingPdf(
      id,
      req.user.userId,
    );
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': buildAttachmentDisposition(fileName),
      'Content-Length': buffer.length,
    });
    res.send(buffer);
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
