import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Analytics,
  Writing,
  WritingRevision,
  WritingSuggestion,
} from 'src/entities';
import { WritingsService } from './writings.service';
import { WritingRevisionsService } from './writing-revisions.service';
import { WritingsController } from './writings.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Writing,
      Analytics,
      WritingSuggestion,
      WritingRevision,
    ]),
  ],
  controllers: [WritingsController],
  providers: [WritingsService, WritingRevisionsService],
  exports: [WritingsService, WritingRevisionsService],
})
export class WritingsModule {}
