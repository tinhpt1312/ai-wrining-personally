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

@Entity({ name: 'user_streaks', schema: 'public' })
export class UserStreak {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    name: 'user_id',
    type: 'uuid',
    nullable: false,
  })
  userId!: string;

  @Column({
    name: 'current_streak_count',
    type: 'integer',
    default: 0,
  })
  currentStreakCount!: number;

  @Column({
    name: 'longest_streak_count',
    type: 'integer',
    default: 0,
  })
  longestStreakCount!: number;

  @Column({
    name: 'streak_start_date',
    type: 'date',
    nullable: true,
  })
  streakStartDate?: Date;

  @Column({
    name: 'last_activity_date',
    type: 'date',
    nullable: true,
  })
  lastActivityDate?: Date;

  @Column({
    name: 'total_days_active',
    type: 'integer',
    default: 0,
  })
  totalDaysActive!: number;

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
