import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FeedbackCategory, Analytics } from 'src/entities';
import { FeedbackCategoriesService } from './feedback-categories.service';
import { FeedbackCategoriesController } from './feedback-categories.controller';

@Module({
  imports: [TypeOrmModule.forFeature([FeedbackCategory, Analytics])],
  providers: [FeedbackCategoriesService],
  controllers: [FeedbackCategoriesController],
  exports: [FeedbackCategoriesService],
})
export class FeedbackCategoriesModule implements OnModuleInit {
  constructor(private readonly categoriesService: FeedbackCategoriesService) {}

  async onModuleInit() {
    await this.categoriesService.initializeDefaultCategories();
  }
}
