import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserBookProgress } from 'src/entities';
import { ERROR_CODE } from 'src/constants';
import { throwAppError } from 'src/common/app.exception';
import { BookChaptersService } from './book-chapters.service';
import { BooksService } from 'src/modules/books/services/books.service';
import { UpdateBookProgressDTO } from '../dto';
import { Role } from 'src/types/auth.type';

@Injectable()
export class BookProgressService {
  constructor(
    @InjectRepository(UserBookProgress)
    private readonly progressRepository: Repository<UserBookProgress>,
    private readonly booksService: BooksService,
    private readonly chaptersService: BookChaptersService,
  ) {}

  async getProgress(
    userId: string,
    bookId: string,
    role?: Role,
  ): Promise<UserBookProgress | null> {
    if (!userId) {
      throwAppError(ERROR_CODE.USER_ID_REQUIRED);
    }

    await this.booksService.findOne(bookId, { userId, role });

    return this.progressRepository.findOne({
      where: { userId, bookId },
    });
  }

  async upsertProgress(
    userId: string,
    bookId: string,
    dto: UpdateBookProgressDTO,
    role?: Role,
  ): Promise<UserBookProgress> {
    if (!userId) {
      throwAppError(ERROR_CODE.USER_ID_REQUIRED);
    }

    const book = await this.booksService.findOne(bookId, { userId, role });
    const chapter = await this.chaptersService.findOne(bookId, dto.chapterId, {
      userId,
      role,
    });

    const chapterIndex = chapter.orderIndex;
    const totalChapters = book.totalChapters || 1;
    const computedPercent = Math.min(
      100,
      Math.round((chapterIndex / totalChapters) * 100),
    );

    let progress = await this.progressRepository.findOne({
      where: { userId, bookId },
    });

    if (!progress) {
      progress = this.progressRepository.create({ userId, bookId });
    }

    progress.currentChapterId = dto.chapterId;
    progress.scrollOffset = dto.scrollOffset ?? 0;
    progress.percentComplete = dto.percentComplete ?? computedPercent;
    progress.lastReadAt = new Date();

    return this.progressRepository.save(progress);
  }
}
