import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
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
      throw new BadRequestException('Writing ID is required');
    }

    const writing = await this.writingRepository.findOne({
      where: { id },
      relations: { user: true },
    });

    if (!writing) {
      throw new NotFoundException(`Writing with ID ${id} not found`);
    }

    if (writing.status !== WritingStatusEnum.PUBLIC) {
      throw new ForbiddenException(
        'Bài viết chưa được đặt ở trạng thái công khai',
      );
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
      throw new BadRequestException('Analytics ID is required');
    }

    const analysis = await this.analyticsRepository.findOne({
      where: { id },
      relations: { writing: { user: true } },
    });

    if (!analysis) {
      throw new NotFoundException(`Analytics with ID ${id} not found`);
    }

    const writing = analysis.writing;

    if (!writing) {
      throw new NotFoundException('Không tìm thấy bài viết liên quan');
    }

    if (writing.status !== WritingStatusEnum.PUBLIC) {
      throw new ForbiddenException(
        'Bài viết chưa được đặt ở trạng thái công khai',
      );
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
