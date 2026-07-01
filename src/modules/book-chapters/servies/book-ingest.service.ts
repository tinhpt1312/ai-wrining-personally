import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as mammoth from 'mammoth';
import { Repository } from 'typeorm';
import { Book } from 'src/entities';
import { ERROR_CODE } from 'src/constants';
import { throwAppError, AppException } from 'src/common/app.exception';
import {
  estimateReadingMinutes,
  splitHtmlIntoChapters,
} from 'src/utils/book-chapter-splitter.util';
import { parseEpubToHtml } from 'src/utils/epub-parser.util';
import {
  parsePdfToPlainText,
  plainTextToHtml,
} from 'src/utils/pdf-parser.util';
import { Role } from 'src/types/auth.type';
import { UploadBookDTO } from 'src/modules/books/dto/upload-book.dto';
import {
  BookApprovalStatusEnum,
  BookFileFormatEnum,
  BookSourceTypeEnum,
} from 'src/modules/books/enum';
import { BookChaptersService } from './book-chapters.service';
import { BooksService } from 'src/modules/books/services/books.service';

const MAX_BOOK_FILE_SIZE = 15 * 1024 * 1024;
const ALLOWED_EXTENSIONS = ['.docx', '.epub', '.pdf'];

@Injectable()
export class BookIngestService {
  private readonly logger = new Logger(BookIngestService.name);

  constructor(
    @InjectRepository(Book)
    private readonly bookRepository: Repository<Book>,
    private readonly booksService: BooksService,
    private readonly chaptersService: BookChaptersService,
  ) {}

  async uploadBook(
    file: Express.Multer.File,
    dto: UploadBookDTO,
    user: { userId: string; role: Role },
  ): Promise<{ book: Book; chapterCount: number; readingTimeMinutes: number }> {
    const isAdmin = user.role === Role.ADMIN;
    const fileFormat = this.getFileFormat(file.originalname);

    const book = this.bookRepository.create({
      title: dto.title,
      author: dto.author,
      description: dto.description,
      coverUrl: dto.coverUrl,
      category: dto.category,
      tags: dto.tags ?? [],
      writingTypes: dto.writingTypes ?? [],
      sourceType: isAdmin
        ? BookSourceTypeEnum.ADMIN_UPLOAD
        : BookSourceTypeEnum.USER_UPLOAD,
      isPublic: isAdmin,
      approvalStatus: isAdmin
        ? BookApprovalStatusEnum.APPROVED
        : BookApprovalStatusEnum.PENDING,
      uploadedByUserId: user.userId,
      fileFormat,
    });

    const savedBook = await this.bookRepository.save(book);
    const ingestResult = await this.ingestFile(savedBook.id, file, {
      userId: user.userId,
      role: user.role,
    });

    const updatedBook = await this.booksService.findOne(savedBook.id, {
      userId: user.userId,
      role: user.role,
    });

    return {
      book: updatedBook,
      ...ingestResult,
    };
  }

  async ingestFile(
    bookId: string,
    file: Express.Multer.File,
    context?: { userId?: string; role?: Role },
  ): Promise<{ chapterCount: number; readingTimeMinutes: number }> {
    if (!file) {
      throwAppError(ERROR_CODE.FILE_REQUIRED);
    }

    if (file.size > MAX_BOOK_FILE_SIZE) {
      throwAppError(ERROR_CODE.BOOK_FILE_TOO_LARGE);
    }

    const extension = this.getExtension(file.originalname);
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      if (extension === '.doc') {
        throwAppError(ERROR_CODE.DOC_LEGACY_NOT_SUPPORTED);
      }
      throwAppError(ERROR_CODE.UNSUPPORTED_BOOK_FORMAT);
    }

    const book = await this.booksService.findOne(bookId, {
      userId: context?.userId,
      role: context?.role,
      includePrivate: context?.role === Role.ADMIN,
    });

    if (
      context?.role !== Role.ADMIN &&
      book.uploadedByUserId &&
      book.uploadedByUserId !== context?.userId
    ) {
      throwAppError(ERROR_CODE.BOOK_ACCESS_DENIED);
    }

    try {
      const html = await this.parseFileToHtml(file.buffer, extension);
      const parsedChapters = splitHtmlIntoChapters(html);

      if (parsedChapters.length === 0) {
        throwAppError(ERROR_CODE.BOOK_INGEST_FAILED);
      }

      await this.chaptersService.replaceChaptersForBook(bookId, parsedChapters);

      const totalWords = parsedChapters.reduce(
        (sum, chapter) => sum + chapter.wordCount,
        0,
      );
      const readingTimeMinutes = estimateReadingMinutes(totalWords);
      const fileFormat = this.extensionToFormat(extension);

      book.totalChapters = parsedChapters.length;
      book.readingTimeMinutes = readingTimeMinutes;
      book.fileFormat = fileFormat;

      if (book.sourceType === BookSourceTypeEnum.EXTERNAL_LINK) {
        book.sourceType =
          context?.role === Role.ADMIN
            ? BookSourceTypeEnum.ADMIN_UPLOAD
            : BookSourceTypeEnum.USER_UPLOAD;
      }

      await this.bookRepository.save(book);

      this.logger.log(
        `Ingested ${parsedChapters.length} chapters for book ${bookId} (${fileFormat})`,
      );

      return {
        chapterCount: parsedChapters.length,
        readingTimeMinutes,
      };
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }
      this.logger.warn('Book ingest failed', error);
      throwAppError(ERROR_CODE.BOOK_INGEST_FAILED);
    }
  }

  async ingestDocx(
    bookId: string,
    file: Express.Multer.File,
    context?: { userId?: string; role?: Role },
  ): Promise<{ chapterCount: number; readingTimeMinutes: number }> {
    return this.ingestFile(bookId, file, context);
  }

  private async parseFileToHtml(buffer: Buffer, extension: string): Promise<string> {
    if (extension === '.docx') {
      const result = await mammoth.convertToHtml({ buffer });
      const html = result.value.trim();
      if (!html || html.length < 20) {
        throwAppError(ERROR_CODE.FILE_EMPTY_OR_CORRUPT);
      }
      return html;
    }

    if (extension === '.epub') {
      return parseEpubToHtml(buffer);
    }

    if (extension === '.pdf') {
      const text = await parsePdfToPlainText(buffer);
      return plainTextToHtml(text);
    }

    throwAppError(ERROR_CODE.UNSUPPORTED_BOOK_FORMAT);
  }

  private getExtension(filename: string): string {
    const dot = filename.lastIndexOf('.');
    if (dot === -1) return '';
    return filename.slice(dot).toLowerCase();
  }

  private getFileFormat(filename: string): string {
    return this.extensionToFormat(this.getExtension(filename));
  }

  private extensionToFormat(extension: string): string {
    switch (extension) {
      case '.docx':
        return BookFileFormatEnum.DOCX;
      case '.epub':
        return BookFileFormatEnum.EPUB;
      case '.pdf':
        return BookFileFormatEnum.PDF;
      default:
        return extension.replace('.', '');
    }
  }
}
