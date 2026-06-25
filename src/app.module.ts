import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PostgresConfiguration } from './config';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { WritingsModule } from './modules/writings/writings.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { WritingSuggestionsModule } from './modules/writing-suggestions/writing-suggestions.module';
import { AdminModule } from './modules/admin/admin.module';
import { ShareModule } from './modules/share/share.module';
import { DocumentsModule } from './modules/documents/documents.module';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useClass: PostgresConfiguration,
    }),
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    AuthModule,
    WritingsModule,
    AnalyticsModule,
    UsersModule,
    WritingSuggestionsModule,
    AdminModule,
    ShareModule,
    DocumentsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
