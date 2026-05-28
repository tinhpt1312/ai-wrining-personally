import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DailyTip } from 'src/entities';
import { DailyTipsService } from './daily-tips.service';
import { DailyTipsController } from './daily-tips.controller';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [TypeOrmModule.forFeature([DailyTip]), AiModule],
  providers: [DailyTipsService],
  controllers: [DailyTipsController],
  exports: [DailyTipsService],
})
export class DailyTipsModule {}
