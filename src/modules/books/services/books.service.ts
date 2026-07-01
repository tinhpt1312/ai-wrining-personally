import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Book } from 'src/entities';
import { ERROR_CODE } from 'src/constants';
import { throwAppError } from 'src/common/app.exception';
import { Role } from 'src/types/auth.type';
import { CreateBookDTO, QueryBookDTO, UpdateBookDTO } from '../dto';
import {
  BookApprovalStatusEnum,
  BookSourceTypeEnum,
} from '../enum';

export interface BookAccessContext {
  userId?: string;
  role?: Role;
  includePrivate?: boolean;
}

@Injectable()
export class BooksService {
  constructor(
    @InjectRepository(Book)
    private readonly bookRepository: Repository<Book>,
  ) {}

  canAccessBook(book: Book, context?: BookAccessContext): boolean {
    const { userId, role, includePrivate } = context ?? {};

    if (includePrivate && role === Role.ADMIN) {
      return true;
    }

    if (
      book.isPublic &&
      book.approvalStatus === BookApprovalStatusEnum.APPROVED
    ) {
      return true;
    }

    if (userId && book.uploadedByUserId === userId) {
      return true;
    }

    if (role === Role.ADMIN) {
      return true;
    }

    return false;
  }

  canDeleteBook(book: Book, context?: BookAccessContext): boolean {
    const { userId, role } = context ?? {};

    if (role === Role.ADMIN) {
      return true;
    }

    return !!userId && book.uploadedByUserId === userId;
  }

  async create(dto: CreateBookDTO): Promise<Book> {
    const book = this.bookRepository.create({
      ...dto,
      tags: dto.tags ?? [],
      writingTypes: dto.writingTypes ?? [],
      sourceType: dto.sourceType ?? BookSourceTypeEnum.EXTERNAL_LINK,
      isPublic: dto.isPublic ?? true,
      approvalStatus: BookApprovalStatusEnum.APPROVED,
    });
    return this.bookRepository.save(book);
  }

  async findAll(
    query: QueryBookDTO,
    options?: { includePrivate?: boolean; uploadedByUserId?: string; pendingOnly?: boolean },
  ) {
    const { limit = 12, offset = 0, category, writingType, search } = query;
    const includePrivate = options?.includePrivate ?? false;
    const uploadedByUserId = options?.uploadedByUserId;
    const pendingOnly = options?.pendingOnly ?? false;

    const queryBuilder = this.bookRepository.createQueryBuilder('book');

    if (pendingOnly) {
      queryBuilder.where('book.approval_status = :approvalStatus', {
        approvalStatus: BookApprovalStatusEnum.PENDING,
      });
    } else if (uploadedByUserId) {
      queryBuilder.where('book.uploaded_by_user_id = :uploadedByUserId', {
        uploadedByUserId,
      });
    } else if (!includePrivate) {
      queryBuilder
        .where('book.is_public = :isPublic', { isPublic: true })
        .andWhere('book.approval_status = :approvalStatus', {
          approvalStatus: BookApprovalStatusEnum.APPROVED,
        });
    }

    if (category) {
      queryBuilder.andWhere('book.category = :category', { category });
    }

    if (writingType) {
      queryBuilder.andWhere('book.writing_types @> :writingType', {
        writingType: JSON.stringify([writingType]),
      });
    }

    if (search) {
      queryBuilder.andWhere(
        '(book.title ILIKE :search OR book.author ILIKE :search OR book.description ILIKE :search OR book.tags::text ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    queryBuilder.orderBy('book.created_at', 'DESC').skip(offset).take(limit);

    const [books, total] = await queryBuilder.getManyAndCount();

    return {
      data: books,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + books.length < total,
      },
    };
  }

  async findOne(id: string, context?: BookAccessContext): Promise<Book> {
    const book = await this.bookRepository.findOne({ where: { id } });

    if (!book || !this.canAccessBook(book, context)) {
      throwAppError(ERROR_CODE.BOOK_NOT_FOUND);
    }

    return book;
  }

  async update(id: string, dto: UpdateBookDTO): Promise<Book> {
    const book = await this.findOne(id, { includePrivate: true, role: Role.ADMIN });

    Object.assign(book, dto);
    return this.bookRepository.save(book);
  }

  async remove(
    id: string,
    context?: BookAccessContext,
  ): Promise<{ message: string }> {
    const book = await this.bookRepository.findOne({ where: { id } });

    if (!book) {
      throwAppError(ERROR_CODE.BOOK_NOT_FOUND);
    }

    if (!this.canDeleteBook(book, context)) {
      throwAppError(ERROR_CODE.BOOK_ACCESS_DENIED);
    }

    await this.bookRepository.remove(book);
    return { message: 'Book deleted successfully' };
  }

  async approve(id: string): Promise<Book> {
    const book = await this.findOne(id, { includePrivate: true, role: Role.ADMIN });

    if (book.approvalStatus !== BookApprovalStatusEnum.PENDING) {
      throwAppError(ERROR_CODE.BOOK_NOT_PENDING);
    }

    book.approvalStatus = BookApprovalStatusEnum.APPROVED;
    book.isPublic = true;
    book.rejectionReason = null;
    return this.bookRepository.save(book);
  }

  async reject(id: string, reason?: string): Promise<Book> {
    const book = await this.findOne(id, { includePrivate: true, role: Role.ADMIN });

    if (book.approvalStatus !== BookApprovalStatusEnum.PENDING) {
      throwAppError(ERROR_CODE.BOOK_NOT_PENDING);
    }

    book.approvalStatus = BookApprovalStatusEnum.REJECTED;
    book.isPublic = false;
    book.rejectionReason = reason?.trim() || null;
    return this.bookRepository.save(book);
  }

  async getCatalogForRecommendation(writingType?: string): Promise<Book[]> {
    const queryBuilder = this.bookRepository
      .createQueryBuilder('book')
      .where('book.is_public = :isPublic', { isPublic: true })
      .andWhere('book.approval_status = :approvalStatus', {
        approvalStatus: BookApprovalStatusEnum.APPROVED,
      });

    if (writingType) {
      queryBuilder.andWhere('book.writing_types @> :writingType', {
        writingType: JSON.stringify([writingType]),
      });
    }

    return queryBuilder.orderBy('book.title', 'ASC').take(50).getMany();
  }
}
