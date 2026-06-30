import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ERROR_CODE } from 'src/constants';
import { throwAppError } from 'src/common/app.exception';
import { Analytics, Writing } from 'src/entities';
import { Repository } from 'typeorm';
import { WritingStatusEnum } from '../writings/enum';

@Injectable()
export class ShareService {
  constructor(
    @InjectRepository(Writing)
    private readonly writingRepository: Repository<Writing>,
    @InjectRepository(Analytics)
    private readonly analyticsRepository: Repository<Analytics>,
  ) {}

  async findPublicWriting(id: string) {
    if (!id) {
      throwAppError(ERROR_CODE.WRITING_ID_REQUIRED);
    }

    const writing = await this.writingRepository.findOne({
      where: { id },
      relations: { user: true },
    });

    if (!writing) {
      throwAppError(ERROR_CODE.WRITING_NOT_FOUND);
    }

    if (writing.status !== WritingStatusEnum.PUBLIC) {
      throwAppError(ERROR_CODE.WRITING_NOT_PUBLIC);
    }

    return {
      id: writing.id,
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

  async findPublicAnalysis(id: string) {
    if (!id) {
      throwAppError(ERROR_CODE.ANALYTICS_ID_REQUIRED);
    }

    const analysis = await this.analyticsRepository.findOne({
      where: { id },
      relations: { writing: { user: true } },
    });

    if (!analysis) {
      throwAppError(ERROR_CODE.ANALYTICS_NOT_FOUND);
    }

    const writing = analysis.writing;

    if (!writing) {
      throwAppError(ERROR_CODE.RELATED_WRITING_NOT_FOUND);
    }

    if (writing.status !== WritingStatusEnum.PUBLIC) {
      throwAppError(ERROR_CODE.WRITING_NOT_PUBLIC);
    }

    return {
      id: analysis.id,
      writingId: analysis.writingId,
      feedbackJson: analysis.feedbackJson,
      createdAt: analysis.createdAt,
      writing: {
        id: writing.id,
        title: writing.title,
        content: writing.content,
        type: writing.type,
        author: {
          username: writing.user?.username,
          fullName: writing.user?.fullName ?? null,
        },
      },
    };
  }
}
