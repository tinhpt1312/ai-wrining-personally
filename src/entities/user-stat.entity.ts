import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './users.entity';

@Entity({ name: 'user_stats', schema: 'public' })
export class UserStat {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    name: 'user_id',
    type: 'uuid',
    nullable: false,
    unique: true,
  })
  userId!: string;

  @Column({
    name: 'total_points',
    type: 'integer',
    default: 0,
  })
  totalPoints!: number;

  @Column({
    name: 'total_submissions',
    type: 'integer',
    default: 0,
  })
  totalSubmissions!: number;

  @Column({
    name: 'total_word_count',
    type: 'integer',
    default: 0,
  })
  totalWordCount!: number;

  @Column({
    name: 'average_score',
    type: 'float',
    default: 0,
  })
  averageScore!: number; // average of all analysis scores

  @Column({
    name: 'current_streak',
    type: 'integer',
    default: 0,
  })
  currentStreak!: number; // days with submissions

  @Column({
    name: 'longest_streak',
    type: 'integer',
    default: 0,
  })
  longestStreak!: number;

  @Column({
    name: 'last_submission_date',
    type: 'timestamp with time zone',
    nullable: true,
  })
  lastSubmissionDate?: Date;

  @Column({
    name: 'level',
    type: 'integer',
    default: 1,
  })
  level!: number; // based on points

  @Column({
    name: 'badges_count',
    type: 'integer',
    default: 0,
  })
  badgesCount!: number;

  @Column({
    name: 'improvement_percentage',
    type: 'float',
    default: 0,
  })
  improvementPercentage!: number; // % improvement over time

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

  @ManyToOne(() => User, (user) => user.id)
  @JoinColumn({ name: 'user_id' })
  user?: User;
}
