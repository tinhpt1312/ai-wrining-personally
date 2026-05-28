import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { FeedbackCategoriesService } from './feedback-categories.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('api/feedback-categories')
@UseGuards(JwtAuthGuard)
export class FeedbackCategoriesController {
  constructor(private readonly categoriesService: FeedbackCategoriesService) {}

  /**
   * Get all categories
   */
  @Get('all')
  async getAllCategories() {
    const categories = await this.categoriesService.getAllCategories();
    return { data: categories };
  }

  /**
   * Get learning paths
   */
  @Get('learning-paths')
  async getLearningPaths(@Request() req: any) {
    const paths = await this.categoriesService.getUserLearningPaths(
      req.user.id,
    );
    return { data: paths };
  }

  /**
   * Get specific learning path
   */
  @Get('learning-paths/:categoryKey')
  async getSpecificLearningPath(
    @Param('categoryKey') categoryKey: string,
    @Request() req: any,
  ) {
    const path = await this.categoriesService.getSpecificLearningPath(
      categoryKey,
      req.user.id,
    );
    return { data: path };
  }

  /**
   * Get category by key
   */
  @Get(':key')
  async getCategoryByKey(@Param('key') key: string) {
    const category = await this.categoriesService.getCategoryByKey(key);
    return { data: category };
  }
}
