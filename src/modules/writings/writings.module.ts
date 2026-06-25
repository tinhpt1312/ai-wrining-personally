import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Analytics,
  Writing,
  WritingRevision,
  WritingSuggestion,
} from 'src/entities';
import { AnalyticsModule } from '../analytics/analytics.module';
import { AiModule } from '../ai/ai.module';
import { WritingsService } from './writings.service';
import { WritingRevisionsService } from './writing-revisions.service';
import { WritingOutlineService } from './services/writing-outline.service';
import { WritingsController } from './writings.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Writing,
      Analytics,
      WritingSuggestion,
      WritingRevision,
    ]),
    AnalyticsModule,
    AiModule,
  ],
  controllers: [WritingsController],
  providers: [WritingsService, WritingRevisionsService, WritingOutlineService],
  exports: [WritingsService, WritingRevisionsService, WritingOutlineService],
})
export class WritingsModule {}
