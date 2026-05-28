import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DailyTip } from 'src/entities';
import { Repository } from 'typeorm';
import { PromptTemplatesService } from '../ai/services/prompt-templates.service';
import { OpenAiProvider } from '../ai/providers/openai.provider';

export interface DailyTipDTO {
  category: string;
  title: string;
  content: string;
  exampleBefore?: string;
  exampleAfter?: string;
  basedOnAnalyticsIds?: string[];
}

@Injectable()
export class DailyTipsService {
  private readonly logger = new Logger(DailyTipsService.name);

  constructor(
    @InjectRepository(DailyTip)
    private readonly dailyTipRepository: Repository<DailyTip>,
    private readonly openAiProvider: OpenAiProvider,
    private readonly promptTemplatesService: PromptTemplatesService,
  ) {}

  /**
   * Get today's daily tip for a user
   */
  async getDailyTip(userId: string): Promise<DailyTip | null> {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const tip = await this.dailyTipRepository.findOne({
      where: {
        userId,
        tipDate: today,
      },
    });

    return tip || null;
  }

  /**
   * Get all daily tips for a user
   */
  async getUserTips(
    userId: string,
    limit: number = 10,
    offset: number = 0,
  ): Promise<{ tips: DailyTip[]; total: number }> {
    const [tips, total] = await this.dailyTipRepository.findAndCount({
      where: { userId },
      order: { tipDate: 'DESC' },
      take: limit,
      skip: offset,
    });

    return { tips, total };
  }

  /**
   * Mark a tip as read
   */
  async markTipAsRead(tipId: string, userId: string): Promise<DailyTip> {
    const tip = await this.dailyTipRepository.findOne({
      where: { id: tipId, userId },
    });

    if (!tip) {
      throw new NotFoundException('Daily tip not found');
    }

    tip.isRead = true;
    return await this.dailyTipRepository.save(tip);
  }

  /**
   * Generate daily tip based on user's common mistakes
   */
  async generateDailyTip(
    userId: string,
    commonMistakeCategories: string[],
  ): Promise<DailyTip> {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    // Check if tip already exists for today
    const existingTip = await this.getDailyTip(userId);
    if (existingTip) {
      return existingTip;
    }

    // Select a random category from common mistakes
    const category =
      commonMistakeCategories.length > 0
        ? commonMistakeCategories[
            Math.floor(Math.random() * commonMistakeCategories.length)
          ]
        : 'grammar';

    try {
      // Generate tip using AI
      const tipContent = await this.openAiProvider.generateDailyTip(category);

      const newTip = this.dailyTipRepository.create({
        userId,
        tipDate: today,
        category,
        title: tipContent.title,
        content: tipContent.content,
        exampleBefore: tipContent.exampleBefore,
        exampleAfter: tipContent.exampleAfter,
      });

      return await this.dailyTipRepository.save(newTip);
    } catch (error) {
      this.logger.error(
        `Failed to generate daily tip for user ${userId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get tips by category
   */
  async getTipsByCategory(
    userId: string,
    category: string,
  ): Promise<DailyTip[]> {
    return await this.dailyTipRepository.find({
      where: { userId, category },
      order: { tipDate: 'DESC' },
    });
  }

  /**
   * Get unread tips count
   */
  async getUnreadTipsCount(userId: string): Promise<number> {
    return await this.dailyTipRepository.count({
      where: { userId, isRead: false },
    });
  }

  /**
   * Create a custom daily tip (admin function)
   */
  async createCustomTip(userId: string, dto: DailyTipDTO): Promise<DailyTip> {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const tip = this.dailyTipRepository.create({
      userId,
      tipDate: today,
      ...dto,
    });

    return await this.dailyTipRepository.save(tip);
  }
}
