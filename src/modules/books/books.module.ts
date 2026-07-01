import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Book } from 'src/entities';
import { AiModule } from 'src/shared/ai/ai.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { AuthModule } from '../auth/auth.module';
import { BooksController } from './books.controller';
import { BooksService } from './services/books.service';
import { BookRecommendationService } from './services/book-recommendation.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Book]),
    AiModule,
    AnalyticsModule,
    AuthModule,
  ],
  controllers: [BooksController],
  providers: [BooksService, BookRecommendationService],
  exports: [BooksService],
})
export class BooksModule {}
