import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ERROR_CODE } from 'src/constants';
import { throwAppError } from 'src/common/app.exception';
import {
  Writing,
  Analytics,
  WritingSuggestion,
  WritingRevision,
} from 'src/entities';
import { CreateWritingDTO, UpdateWritingDTO, QueryWritingDTO } from './dto';
import { WritingStatusEnum } from './enum';
import { isActiveWritingType } from './constants/active-writing-types';

@Injectable()
export class WritingsService {
  constructor(
    @InjectRepository(Writing)
    private readonly writingRepository: Repository<Writing>,
    @InjectRepository(Analytics)
    private readonly analyticsRepository: Repository<Analytics>,
    @InjectRepository(WritingSuggestion)
    private readonly writingSuggestionRepository: Repository<WritingSuggestion>,
    @InjectRepository(WritingRevision)
    private readonly writingRevisionRepository: Repository<WritingRevision>,
  ) {}

  /**
   * Create a new writing
   */
  async create(userId: string, dto: CreateWritingDTO) {
    if (!userId) {
      throwAppError(ERROR_CODE.USER_ID_REQUIRED);
    }

    if (!isActiveWritingType(dto.type)) {
      throwAppError(ERROR_CODE.WRITING_TYPE_NOT_SUPPORTED);
    }

    const writing = this.writingRepository.create({
      userId,
      title: dto.title,
      content: dto.content,
      type: dto.type,
      status: dto.status || WritingStatusEnum.DRAFT,
      outlineJson: dto.outlineJson ?? null,
    });

    return this.writingRepository.save(writing);
  }

  /**
   * Get writings list with pagination and filtering
   */
  async findAll(userId: string, query: QueryWritingDTO) {
    if (!userId) {
      throwAppError(ERROR_CODE.USER_ID_REQUIRED);
    }

    const { limit = 10, offset = 0, type, status, search } = query;

    const queryBuilder = this.writingRepository
      .createQueryBuilder('writing')
      .where('writing.user_id = :userId', { userId });

    if (type) {
      queryBuilder.andWhere('writing.type = :type', { type });
    }

    if (status) {
      queryBuilder.andWhere('writing.status = :status', { status });
    }

    if (search) {
      queryBuilder.andWhere(
        '(writing.title ILIKE :search OR writing.content ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    queryBuilder.orderBy('writing.created_at', 'DESC').skip(offset).take(limit);

    const [writings, total] = await queryBuilder.getManyAndCount();

    return {
      data: writings,
      pagination: {
        limit,
        offset,
        total,
        hasMore: offset + limit < total,
      },
    };
  }

  /**
   * Browse public writings from all users
   */
  async findAllPublic(query: QueryWritingDTO) {
    const { limit = 10, offset = 0, type, search } = query;

    const queryBuilder = this.writingRepository
      .createQueryBuilder('writing')
      .innerJoinAndSelect('writing.user', 'user')
      .where('writing.status = :status', { status: WritingStatusEnum.PUBLIC });

    if (type) {
      queryBuilder.andWhere('writing.type = :type', { type });
    }

    if (search) {
      queryBuilder.andWhere(
        '(writing.title ILIKE :search OR writing.content ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    queryBuilder.orderBy('writing.created_at', 'DESC').skip(offset).take(limit);

    const [writings, total] = await queryBuilder.getManyAndCount();

    return {
      data: writings.map((writing) => this.toPublicWriting(writing)),
      pagination: {
        limit,
        offset,
        total,
        hasMore: offset + limit < total,
      },
    };
  }

  /**
   * Public writings by a specific author username
   */
  async findPublicByUsername(username: string, query: QueryWritingDTO) {
    const { limit = 10, offset = 0, type, search } = query;

    const queryBuilder = this.writingRepository
      .createQueryBuilder('writing')
      .innerJoinAndSelect('writing.user', 'user')
      .where('writing.status = :status', { status: WritingStatusEnum.PUBLIC })
      .andWhere('user.username = :username', { username });

    if (type) {
      queryBuilder.andWhere('writing.type = :type', { type });
    }

    if (search) {
      queryBuilder.andWhere(
        '(writing.title ILIKE :search OR writing.content ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    queryBuilder.orderBy('writing.created_at', 'DESC').skip(offset).take(limit);

    const [writings, total] = await queryBuilder.getManyAndCount();

    return {
      data: writings.map((writing) => this.toPublicWriting(writing)),
      pagination: {
        limit,
        offset,
        total,
        hasMore: offset + limit < total,
      },
    };
  }

  /**
   * Get a single writing — owner always; others only if public
   */
  async findOne(id: string, userId: string): Promise<Writing> {
    if (!id) {
      throwAppError(ERROR_CODE.WRITING_ID_REQUIRED);
    }

    if (!userId) {
      throwAppError(ERROR_CODE.USER_ID_REQUIRED);
    }

    const writing = await this.writingRepository.findOne({
      where: { id },
      relations: { user: true },
    });

    if (!writing) {
      throwAppError(ERROR_CODE.WRITING_NOT_FOUND);
    }

    if (
      writing.userId !== userId &&
      writing.status !== WritingStatusEnum.PUBLIC
    ) {
      throwAppError(ERROR_CODE.WRITING_ACCESS_DENIED);
    }

    if (writing.user) {
      Object.assign(writing, {
        author: {
          username: writing.user.username,
          fullName: writing.user.fullName ?? null,
        },
      });
      delete (writing as Partial<Writing>).user;
    }

    return writing;
  }

  /**
   * Owner-only lookup for mutations
   */
  private async findOneForOwner(id: string, userId: string): Promise<Writing> {
    const writing = await this.writingRepository.findOne({
      where: { id, userId },
    });

    if (!writing) {
      throwAppError(ERROR_CODE.WRITING_NOT_FOUND);
    }

    return writing;
  }

  private toPublicWriting(writing: Writing) {
    return {
      id: writing.id,
      userId: writing.userId,
      title: writing.title,
      content: writing.content,
      type: writing.type,
      status: writing.status,
      createdAt: writing.createdAt,
      updatedAt: writing.updatedAt,
      author: {
        username: writing.user?.username,
        fullName: writing.user?.fullName ?? null,
      },
    };
  }

  /**
   * Update a writing
   */
  async update(
    id: string,
    userId: string,
    dto: UpdateWritingDTO,
  ): Promise<Writing> {
    if (!id) {
      throwAppError(ERROR_CODE.WRITING_ID_REQUIRED);
    }

    if (!userId) {
      throwAppError(ERROR_CODE.USER_ID_REQUIRED);
    }

    const writing = await this.findOneForOwner(id, userId);

    if (dto.type !== undefined && !isActiveWritingType(dto.type)) {
      throwAppError(ERROR_CODE.WRITING_TYPE_NOT_SUPPORTED);
    }

    const updatedWriting = this.writingRepository.merge(writing, {
      title: dto.title ?? writing.title,
      content: dto.content ?? writing.content,
      type: dto.type ?? writing.type,
      status: dto.status ?? writing.status,
      outlineJson:
        dto.outlineJson !== undefined ? dto.outlineJson : writing.outlineJson,
    });

    return this.writingRepository.save(updatedWriting);
  }

  /**
   * Delete a writing
   */
  async remove(id: string, userId: string): Promise<{ message: string }> {
    if (!id) {
      throwAppError(ERROR_CODE.WRITING_ID_REQUIRED);
    }

    if (!userId) {
      throwAppError(ERROR_CODE.USER_ID_REQUIRED);
    }

    await this.findOneForOwner(id, userId);
    // Delete all related analyses first
    await this.analyticsRepository.delete({ writingId: id });

    // Delete all related writing suggestions
    await this.writingSuggestionRepository.delete({ writingId: id });

    // Delete all related revisions
    await this.writingRevisionRepository.delete({ writingId: id });

    // Finally delete the writing itself
    await this.writingRepository.delete(id);

    return { message: `Writing with ID ${id} has been deleted successfully` };
  }

  /**
   * Get writing statistics for a user
   */
  async getStats(userId: string) {
    if (!userId) {
      throwAppError(ERROR_CODE.USER_ID_REQUIRED);
    }

    const totalCount = await this.writingRepository.count({
      where: { userId },
    });

    // Get stats by status
    const statsByStatus = await this.writingRepository
      .createQueryBuilder('writing')
      .select('COUNT(writing.id)', 'total')
      .addSelect('writing.status', 'status')
      .where('writing.userId = :userId', { userId })
      .groupBy('writing.status')
      .getRawMany();

    // Get stats by type
    const statsByType = await this.writingRepository
      .createQueryBuilder('writing')
      .select('COUNT(writing.id)', 'count')
      .addSelect('writing.type', 'type')
      .where('writing.user_id = :userId', { userId })
      .groupBy('writing.type')
      .getRawMany();

    // Calculate word counts
    const wordStats = await this.writingRepository
      .createQueryBuilder('writing')
      .select(
        "SUM(LENGTH(writing.content) - LENGTH(REPLACE(writing.content, ' ', ''))) + COUNT(writing.id)",
        'totalWords',
      )
      .addSelect(
        "AVG(LENGTH(writing.content) - LENGTH(REPLACE(writing.content, ' ', ''))) + 1",
        'averageLength',
      )
      .where('writing.userId = :userId', { userId })
      .getRawOne();

    // Normalize response format with records instead of arrays
    const byStatus: Record<string, number> = {};
    statsByStatus.forEach((item) => {
      byStatus[item.status] = parseInt(item.total, 10);
    });

    const byType: Record<string, number> = {};
    statsByType.forEach((item) => {
      byType[item.type] = parseInt(item.count, 10);
    });

    return {
      totalWritings: totalCount,
      totalWords: Math.max(0, Math.floor(wordStats?.totalWords || 0)),
      averageLength: Math.max(0, Math.round(wordStats?.averageLength || 0)),
      byStatus,
      byType,
    };
  }
}
