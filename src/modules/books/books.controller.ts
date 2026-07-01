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
import { Book } from 'src/entities';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard';
import { Roles } from 'src/modules/auth/decorators/roles.decorator';
import { Role } from 'src/types/auth.type';
import type { RequestWithUser } from 'src/types';
import { TokenLimitGuard } from '../analytics/guards/token-limit.guard';
import {
  CreateBookDTO,
  QueryBookDTO,
  RecommendBooksDTO,
  RejectBookDTO,
  UpdateBookDTO,
} from './dto';
import { BooksService } from './services/books.service';
import { BookRecommendationService } from './services/book-recommendation.service';

@ApiTags('books')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('books')
export class BooksController {
  constructor(
    private readonly booksService: BooksService,
    private readonly recommendationService: BookRecommendationService,
  ) {}

  @Post('recommend')
  @UseGuards(TokenLimitGuard)
  async recommend(
    @Body() dto: RecommendBooksDTO,
    @Req() req: RequestWithUser,
  ) {
    const recommendations = await this.recommendationService.recommend(
      req.user.userId,
      dto,
    );
    return { data: recommendations };
  }

  @Get('my-uploads')
  async findMyUploads(
    @Query() query: QueryBookDTO,
    @Req() req: RequestWithUser,
  ) {
    return this.booksService.findAll(query, {
      uploadedByUserId: req.user.userId,
    });
  }

  @Get('pending')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async findPending(@Query() query: QueryBookDTO) {
    return this.booksService.findAll(query, { pendingOnly: true });
  }

  @Get()
  async findAll(@Query() query: QueryBookDTO, @Req() req: RequestWithUser) {
    const includePrivate =
      req.user.role === Role.ADMIN && query.includePrivate === true;
    return this.booksService.findAll(query, { includePrivate });
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
  ): Promise<Book> {
    return this.booksService.findOne(id, {
      userId: req.user.userId,
      role: req.user.role,
    });
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async create(@Body() dto: CreateBookDTO): Promise<Book> {
    return this.booksService.create(dto);
  }

  @Patch(':id/approve')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async approve(@Param('id') id: string) {
    const book = await this.booksService.approve(id);
    return { data: book };
  }

  @Patch(':id/reject')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async reject(@Param('id') id: string, @Body() dto: RejectBookDTO) {
    const book = await this.booksService.reject(id, dto.reason);
    return { data: book };
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateBookDTO,
  ): Promise<Book> {
    return this.booksService.update(id, dto);
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
  ): Promise<{ message: string }> {
    return this.booksService.remove(id, {
      userId: req.user.userId,
      role: req.user.role,
    });
  }
}
