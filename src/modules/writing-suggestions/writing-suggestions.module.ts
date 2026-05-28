import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WritingSuggestion, Writing } from 'src/entities';
import { WritingSuggestionsService } from './writing-suggestions.service';
import { WritingSuggestionsController } from './writing-suggestions.controller';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [TypeOrmModule.forFeature([WritingSuggestion, Writing]), AiModule],
  providers: [WritingSuggestionsService],
  controllers: [WritingSuggestionsController],
  exports: [WritingSuggestionsService],
})
export class WritingSuggestionsModule {}
