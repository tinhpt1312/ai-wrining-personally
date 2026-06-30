import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WritingSuggestion, Writing, Analytics } from 'src/entities';
import { WritingSuggestionsService } from './writing-suggestions.service';
import { WritingSuggestionsController } from './writing-suggestions.controller';
import { AiModule } from '../../shared/ai/ai.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([WritingSuggestion, Writing, Analytics]),
    AiModule,
  ],
  providers: [WritingSuggestionsService],
  controllers: [WritingSuggestionsController],
  exports: [WritingSuggestionsService],
})
export class WritingSuggestionsModule {}
