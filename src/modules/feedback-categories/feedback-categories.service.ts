import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FeedbackCategory, Analytics } from 'src/entities';
import { Repository } from 'typeorm';

export interface LearningPath {
  category: FeedbackCategory;
  mistakeCount: number;
  progress: number; // 0-100
  tips: string[];
  exercises: { title: string; description: string }[];
  nextSteps: string[];
}

@Injectable()
export class FeedbackCategoriesService {
  private readonly logger = new Logger(FeedbackCategoriesService.name);

  constructor(
    @InjectRepository(FeedbackCategory)
    private readonly categoryRepository: Repository<FeedbackCategory>,
    @InjectRepository(Analytics)
    private readonly analysisRepository: Repository<Analytics>,
  ) {}

  /**
   * Get all feedback categories
   */
  async getAllCategories(): Promise<FeedbackCategory[]> {
    return await this.categoryRepository.find({
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Get category by key
   */
  async getCategoryByKey(key: string): Promise<FeedbackCategory | null> {
    return await this.categoryRepository.findOne({
      where: { key },
    });
  }

  /**
   * Get learning paths for user
   */
  async getUserLearningPaths(userId: string): Promise<LearningPath[]> {
    const categories = await this.getAllCategories();
    const analyses = await this.analysisRepository.find({
      where: { userId },
    });

    const paths: LearningPath[] = [];

    for (const category of categories) {
      const mistakeCount = this.countMistakesInCategory(analyses, category.key);

      const progressPercentage = Math.min(
        mistakeCount > 0 ? 100 - Math.min(mistakeCount * 10, 100) : 0,
        100,
      );

      const learningResources = (category.learningResources as any) || {};
      const tips = learningResources.tips || [
        `Practice improving your ${category.name.toLowerCase()}`,
      ];
      const exercises = learningResources.exercises || [];

      paths.push({
        category,
        mistakeCount,
        progress: Math.max(0, progressPercentage),
        tips,
        exercises,
        nextSteps: this.generateNextSteps(category.key, mistakeCount),
      });
    }

    // Sort by progress (lowest first - needs most help)
    return paths.sort((a, b) => a.progress - b.progress);
  }

  /**
   * Get specific learning path
   */
  async getSpecificLearningPath(
    categoryKey: string,
    userId: string,
  ): Promise<LearningPath | null> {
    const category = await this.getCategoryByKey(categoryKey);

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const analyses = await this.analysisRepository.find({
      where: { userId },
    });

    const mistakeCount = this.countMistakesInCategory(analyses, categoryKey);

    const progressPercentage = Math.min(
      mistakeCount > 0 ? 100 - Math.min(mistakeCount * 10, 100) : 0,
      100,
    );

    const learningResources = (category.learningResources as any) || {};
    const tips = learningResources.tips || [];
    const exercises = learningResources.exercises || [];

    return {
      category,
      mistakeCount,
      progress: Math.max(0, progressPercentage),
      tips,
      exercises,
      nextSteps: this.generateNextSteps(categoryKey, mistakeCount),
    };
  }

  /**
   * Create a new category
   */
  async createCategory(
    key: string,
    name: string,
    description: string,
    iconEmoji?: string,
    learningResources?: object,
  ): Promise<FeedbackCategory> {
    const existing = await this.categoryRepository.findOne({
      where: { key },
    });

    if (existing) {
      this.logger.warn(`Category with key ${key} already exists`);
      return existing;
    }

    const category = this.categoryRepository.create({
      key,
      name,
      description,
      iconEmoji,
      learningResources,
    });

    return await this.categoryRepository.save(category);
  }

  /**
   * Initialize default categories
   */
  async initializeDefaultCategories(): Promise<void> {
    const defaultCategories = [
      {
        key: 'GRAMMAR',
        name: '📝 Grammar',
        description: 'Grammar rules and sentence structure',
        iconEmoji: '📝',
        learningResources: {
          tips: [
            'Subject-verb agreement is essential',
            'Use correct tense consistency',
            'Avoid sentence fragments',
          ],
          exercises: [
            {
              title: 'Identify the Error',
              description:
                'Find and correct grammar mistakes in sample sentences',
            },
            {
              title: 'Tense Consistency',
              description: 'Practice maintaining consistent verb tenses',
            },
          ],
        },
      },
      {
        key: 'VOCABULARY',
        name: '📚 Vocabulary',
        description: 'Word choice and vocabulary building',
        iconEmoji: '📚',
        learningResources: {
          tips: [
            'Use precise words for clarity',
            'Avoid repetitive word choices',
            'Learn synonyms for common words',
          ],
          exercises: [
            {
              title: 'Word Replacement',
              description: 'Replace overused words with better alternatives',
            },
            {
              title: 'Synonym Challenge',
              description: 'Find and use appropriate synonyms',
            },
          ],
        },
      },
      {
        key: 'PUNCTUATION',
        name: '🎯 Punctuation',
        description: 'Proper use of punctuation marks',
        iconEmoji: '🎯',
        learningResources: {
          tips: [
            'Commas separate independent clauses',
            'Semicolons connect related ideas',
            'Apostrophes show possession or contraction',
          ],
          exercises: [
            {
              title: 'Comma Placement',
              description: 'Practice correct comma usage',
            },
            {
              title: 'Punctuation Rules',
              description: 'Learn and apply all punctuation rules',
            },
          ],
        },
      },
      {
        key: 'STYLE',
        name: '✨ Style',
        description: 'Writing style and tone',
        iconEmoji: '✨',
        learningResources: {
          tips: [
            'Maintain consistent tone throughout',
            'Use active voice when possible',
            'Vary sentence length for readability',
          ],
          exercises: [
            {
              title: 'Active vs Passive',
              description: 'Convert passive sentences to active voice',
            },
            {
              title: 'Tone Analytics',
              description: 'Identify and maintain appropriate tone',
            },
          ],
        },
      },
      {
        key: 'CLARITY',
        name: '💡 Clarity',
        description: 'Clear and concise expression',
        iconEmoji: '💡',
        learningResources: {
          tips: [
            'Use simple, direct language',
            'Eliminate unnecessary words',
            'Organize ideas logically',
          ],
          exercises: [
            {
              title: 'Simplification',
              description: 'Make complex sentences clearer and shorter',
            },
            {
              title: 'Organization',
              description: 'Arrange ideas in logical order',
            },
          ],
        },
      },
      {
        key: 'TONE',
        name: '🎤 Tone',
        description: 'Appropriate tone and voice',
        iconEmoji: '🎤',
        learningResources: {
          tips: [
            'Match tone to your audience',
            'Maintain professional or casual appropriately',
            'Express emotions clearly',
          ],
          exercises: [
            {
              title: 'Tone Adjustment',
              description: 'Rewrite text in different tones',
            },
            {
              title: 'Audience Analytics',
              description: 'Adapt writing for different audiences',
            },
          ],
        },
      },
    ];

    for (const cat of defaultCategories) {
      const existing = await this.categoryRepository.findOne({
        where: { key: cat.key },
      });

      if (!existing) {
        const category = this.categoryRepository.create(cat);
        await this.categoryRepository.save(category);
      }
    }

    this.logger.log('Default feedback categories initialized');
  }

  /**
   * Helper: Count mistakes in a category
   */
  private countMistakesInCategory(
    analyses: Analytics[],
    categoryKey: string,
  ): number {
    let count = 0;

    for (const analysis of analyses) {
      try {
        if (
          analysis.feedbackJson &&
          typeof analysis.feedbackJson === 'object'
        ) {
          const fb = analysis.feedbackJson as any;
          const issues = fb.issues || [];

          count += issues.filter(
            (issue: any) =>
              issue.category?.toUpperCase() === categoryKey.toUpperCase(),
          ).length;
        }
      } catch (e) {
        // Continue counting
      }
    }

    return count;
  }

  /**
   * Helper: Generate next steps
   */
  private generateNextSteps(
    categoryKey: string,
    mistakeCount: number,
  ): string[] {
    const baseSteps = [
      'Review the learning materials',
      'Complete the exercises',
      'Practice on your next writing',
    ];

    if (mistakeCount > 5) {
      return [
        'Focus on this category - frequent mistakes detected',
        'Read and study the tips',
        'Do daily exercises to improve',
        ...baseSteps,
      ];
    }

    if (mistakeCount > 0) {
      return ['Review recent mistakes', ...baseSteps];
    }

    return ['Continue practicing', 'Help others learn', ...baseSteps];
  }
}
