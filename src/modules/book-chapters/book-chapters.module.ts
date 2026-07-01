import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Book, BookChapter, UserBookProgress } from 'src/entities';
import { AuthModule } from '../auth/auth.module';
import { BooksModule } from '../books/books.module';
import { BookChaptersController } from './book-chapters.controller';
import { BookChaptersService, BookProgressService, BookIngestService } from './servies';

@Module({
  imports: [
    TypeOrmModule.forFeature([Book, BookChapter, UserBookProgress]),
    BooksModule,
    AuthModule,
  ],
  controllers: [BookChaptersController],
  providers: [BookChaptersService, BookProgressService, BookIngestService],
  exports: [BookChaptersService, BookProgressService],
})
export class BookChaptersModule {}
