import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ERROR_CODE } from 'src/constants';
import { throwAppError } from 'src/common/app.exception';
import { Writing, WritingRevision } from 'src/entities';
import { CreateWritingRevisionDTO, EnsureBaselineRevisionDTO } from './dto';
import { countWords } from './utils/revision.utils';

export interface RevisionTimelineItem extends WritingRevision {
  wordCount: number;
  wordCountDelta: number;
}

@Injectable()
export class WritingRevisionsService {
  constructor(
    @InjectRepository(WritingRevision)
    private readonly revisionRepository: Repository<WritingRevision>,
    @InjectRepository(Writing)
    private readonly writingRepository: Repository<Writing>,
  ) {}

  async findByWriting(writingId: string, userId: string) {
    await this.assertWritingAccess(writingId, userId);

    const revisions = await this.revisionRepository.find({
      where: { writingId, userId },
      order: { revisionNumber: 'DESC' },
    });

    return { data: revisions, total: revisions.length };
  }

  async findTimeline(
    writingId: string,
    userId: string,
    analysisId?: string,
  ): Promise<{ data: RevisionTimelineItem[]; total: number }> {
    await this.assertWritingAccess(writingId, userId);

    const revisions = await this.revisionRepository.find({
      where: analysisId
        ? { writingId, userId, analysisId }
        : { writingId, userId },
      order: { revisionNumber: 'ASC' },
    });

    const data = revisions.map((revision, index) => {
      const wordCount = countWords(revision.content);
      const previousWords =
        index > 0 ? countWords(revisions[index - 1].content) : wordCount;

      return {
        ...revision,
        wordCount,
        wordCountDelta: wordCount - previousWords,
      };
    });

    return { data, total: data.length };
  }

  async findOne(
    writingId: string,
    revisionId: string,
    userId: string,
  ): Promise<WritingRevision> {
    await this.assertWritingAccess(writingId, userId);

    const revision = await this.revisionRepository.findOne({
      where: { id: revisionId, writingId, userId },
    });

    if (!revision) {
      throwAppError(ERROR_CODE.REVISION_NOT_FOUND);
    }

    return revision;
  }

  async ensureGradingBaseline(
    writingId: string,
    userId: string,
    dto: EnsureBaselineRevisionDTO,
  ): Promise<WritingRevision> {
    await this.assertWritingAccess(writingId, userId);

    const existing = await this.revisionRepository.findOne({
      where: {
        writingId,
        userId,
        analysisId: dto.analysisId,
        source: 'grading_baseline',
      },
    });

    if (existing) {
      return existing;
    }

    return this.create(writingId, userId, {
      content: dto.content,
      source: 'grading_baseline',
      analysisId: dto.analysisId,
    });
  }

  async create(
    writingId: string,
    userId: string,
    dto: CreateWritingRevisionDTO,
  ): Promise<WritingRevision> {
    await this.assertWritingAccess(writingId, userId);

    const latest = await this.revisionRepository.findOne({
      where: { writingId },
      order: { revisionNumber: 'DESC' },
    });

    const revision = this.revisionRepository.create({
      writingId,
      userId,
      content: dto.content,
      source: dto.source ?? 'revision_workspace',
      analysisId: dto.analysisId ?? null,
      parentRevisionId: dto.parentRevisionId ?? latest?.id ?? null,
      revisionNumber: (latest?.revisionNumber ?? 0) + 1,
    });

    return this.revisionRepository.save(revision);
  }

  async restore(
    writingId: string,
    revisionId: string,
    userId: string,
  ): Promise<Writing> {
    const writing = await this.assertWritingAccess(writingId, userId);

    const revision = await this.revisionRepository.findOne({
      where: { id: revisionId, writingId, userId },
    });

    if (!revision) {
      throwAppError(ERROR_CODE.REVISION_NOT_FOUND);
    }

    writing.content = revision.content;
    return this.writingRepository.save(writing);
  }

  private async assertWritingAccess(
    writingId: string,
    userId: string,
  ): Promise<Writing> {
    if (!writingId) {
      throwAppError(ERROR_CODE.WRITING_ID_REQUIRED);
    }

    if (!userId) {
      throwAppError(ERROR_CODE.USER_ID_REQUIRED);
    }

    const writing = await this.writingRepository.findOne({
      where: { id: writingId, userId },
    });

    if (!writing) {
      throwAppError(ERROR_CODE.WRITING_NOT_FOUND);
    }

    return writing;
  }
}
