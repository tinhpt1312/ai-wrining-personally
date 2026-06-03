import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Writing, Analytics, WritingSuggestion } from 'src/entities';
import { CreateWritingDTO, UpdateWritingDTO, QueryWritingDTO } from './dto';
import { WritingStatusEnum } from './enum';

@Injectable()
export class WritingsService {
  constructor(
    @InjectRepository(Writing)
    private readonly writingRepository: Repository<Writing>,
    @InjectRepository(Analytics)
    private readonly analyticsRepository: Repository<Analytics>,
    @InjectRepository(WritingSuggestion)
    private readonly writingSuggestionRepository: Repository<WritingSuggestion>,
  ) {}

  /**
   * Create a new writing
   */
  async create(userId: string, dto: CreateWritingDTO) {
    if (!userId) {
      throw new BadRequestException('User ID is required');
    }

    const writing = this.writingRepository.create({
      userId,
      title: dto.title,
      content: dto.content,
      type: dto.type,
      status: dto.status || WritingStatusEnum.DRAFT,
    });

    return this.writingRepository.save(writing);
  }

  /**
   * Get writings list with pagination and filtering
   */
  async findAll(userId: string, query: QueryWritingDTO) {
    if (!userId) {
      throw new BadRequestException('User ID is required');
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
   * Get a single writing by ID
   */
  async findOne(id: string, userId: string): Promise<Writing> {
    if (!id) {
      throw new BadRequestException('Writing ID is required');
    }

    if (!userId) {
      throw new BadRequestException('User ID is required');
    }

    const writing = await this.writingRepository.findOne({
      where: {
        id,
        userId,
      },
    });

    if (!writing) {
      throw new NotFoundException(
        `Writing with ID ${id} not found or you do not have access to it`,
      );
    }

    return writing;
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
      throw new BadRequestException('Writing ID is required');
    }

    if (!userId) {
      throw new BadRequestException('User ID is required');
    }

    const writing = await this.findOne(id, userId);

    if (writing.userId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to update this writing',
      );
    }

    const updatedWriting = this.writingRepository.merge(writing, {
      title: dto.title || writing.title,
      content: dto.content || writing.content,
      type: dto.type || writing.type,
      status: dto.status || writing.status,
    });

    return this.writingRepository.save(updatedWriting);
  }

  /**
   * Delete a writing
   */
  async remove(id: string, userId: string): Promise<{ message: string }> {
    if (!id) {
      throw new BadRequestException('Writing ID is required');
    }

    if (!userId) {
      throw new BadRequestException('User ID is required');
    }

    const writing = await this.findOne(id, userId);

    if (writing.userId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to delete this writing',
      );
    }

    // Delete all related analyses first
    await this.analyticsRepository.delete({ writingId: id });

    // Delete all related writing suggestions
    await this.writingSuggestionRepository.delete({ writingId: id });

    // Finally delete the writing itself
    await this.writingRepository.delete(id);

    return { message: `Writing with ID ${id} has been deleted successfully` };
  }

  /**
   * Get writing statistics for a user
   */
  async getStats(userId: string) {
    if (!userId) {
      throw new BadRequestException('User ID is required');
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
