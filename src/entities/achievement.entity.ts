import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserAchievement } from './user-achievement.entity';

@Entity({ name: 'achievements', schema: 'public' })
export class Achievement {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    name: 'key',
    type: 'character varying',
    length: 100,
    unique: true,
    nullable: false,
  })
  key!: string; // FIRST_WRITING, 10_WRITINGS, 50_WRITINGS, 100_WORDS, GRAMMAR_MASTER, etc.

  @Column({
    name: 'name',
    type: 'character varying',
    length: 255,
    nullable: false,
  })
  name!: string;

  @Column({
    name: 'description',
    type: 'text',
    nullable: false,
  })
  description!: string;

  @Column({
    name: 'icon_emoji',
    type: 'character varying',
    length: 10,
    nullable: true,
  })
  iconEmoji?: string;

  @Column({
    name: 'badge_color',
    type: 'character varying',
    length: 20,
    nullable: true,
  })
  badgeColor?: string; // gold, silver, bronze, blue, purple

  @Column({
    name: 'points_reward',
    type: 'integer',
    default: 0,
  })
  pointsReward!: number;

  @Column({
    name: 'requirement_type',
    type: 'character varying',
    length: 100,
    nullable: false,
  })
  requirementType!: string; // SUBMISSION_COUNT, WORD_COUNT, SCORE_AVERAGE, STREAK, FEEDBACK_CATEGORY

  @Column({
    name: 'requirement_value',
    type: 'integer',
    nullable: false,
  })
  requirementValue!: number;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp with time zone',
  })
  createdAt!: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamp with time zone',
  })
  updatedAt!: Date;

  @OneToMany(
    () => UserAchievement,
    (userAchievement) => userAchievement.achievement,
  )
  userAchievements?: UserAchievement[];
}
