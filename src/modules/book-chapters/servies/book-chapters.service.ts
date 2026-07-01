import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BookChapter } from 'src/entities';
import { ERROR_CODE } from 'src/constants';
import { throwAppError } from 'src/common/app.exception';
import { Role } from 'src/types/auth.type';
import { BooksService } from 'src/modules/books/services/books.service';

export interface BookChapterSummary {
  id: string;
  bookId: string;
  orderIndex: number;
  title: string;
  wordCount?: number | null;
}

export interface BookAccessOptions {
  userId?: string;
  role?: Role;
}

@Injectable()
export class BookChaptersService {
  constructor(
    @InjectRepository(BookChapter)
    private readonly chapterRepository: Repository<BookChapter>,
    private readonly booksService: BooksService,
  ) {}

  async findSummariesByBook(
    bookId: string,
    access?: BookAccessOptions,
  ): Promise<BookChapterSummary[]> {
    await this.booksService.findOne(bookId, {
      userId: access?.userId,
      role: access?.role,
    });

    const chapters = await this.chapterRepository.find({
      where: { bookId },
      order: { orderIndex: 'ASC' },
      select: {
        id: true,
        bookId: true,
        orderIndex: true,
        title: true,
        wordCount: true,
      },
    });

    if (chapters.length === 0) {
      throwAppError(ERROR_CODE.BOOK_NO_CHAPTERS);
    }

    return chapters;
  }

  async findOne(
    bookId: string,
    chapterId: string,
    access?: BookAccessOptions,
  ): Promise<BookChapter> {
    await this.booksService.findOne(bookId, {
      userId: access?.userId,
      role: access?.role,
    });

    const chapter = await this.chapterRepository.findOne({
      where: { id: chapterId, bookId },
    });

    if (!chapter) {
      throwAppError(ERROR_CODE.CHAPTER_NOT_FOUND);
    }

    return chapter;
  }

  async replaceChaptersForBook(
    bookId: string,
    chapters: Array<{
      title: string;
      content: string;
      contentFormat: string;
      wordCount: number;
    }>,
  ): Promise<BookChapter[]> {
    await this.chapterRepository.delete({ bookId });

    const entities = chapters.map((chapter, index) =>
      this.chapterRepository.create({
        bookId,
        orderIndex: index + 1,
        title: chapter.title,
        content: chapter.content,
        contentFormat: chapter.contentFormat,
        wordCount: chapter.wordCount,
      }),
    );

    return this.chapterRepository.save(entities);
  }
}
