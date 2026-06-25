import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { Analytics, Writing, UserTokenUsage } from 'src/entities';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { AiModule } from '../ai/ai.module';
import { ResponseParserService } from './services/response-parser.service';
import { TokenTrackerService } from './services/token-tracker.service';
import { TokenResetScheduler } from './services/token-reset.scheduler';
import { ExportService } from './services/export.service';
import { TokenLimitGuard } from './guards/token-limit.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([Analytics, Writing, UserTokenUsage]),
    ScheduleModule.forRoot(),
    AiModule,
  ],
  controllers: [AnalyticsController],
  providers: [
    AnalyticsService,
    ResponseParserService,
    TokenTrackerService,
    TokenResetScheduler,
    ExportService,
    TokenLimitGuard,
  ],
  exports: [AnalyticsService, TokenTrackerService, ExportService, TokenLimitGuard],
})
export class AnalyticsModule {}
