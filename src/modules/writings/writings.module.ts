import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Analytics, Writing, WritingSuggestion } from 'src/entities';
import { WritingsService } from './writings.service';
import { WritingsController } from './writings.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Writing, Analytics, WritingSuggestion])],
  controllers: [WritingsController],
  providers: [WritingsService],
  exports: [WritingsService],
})
export class WritingsModule {}
